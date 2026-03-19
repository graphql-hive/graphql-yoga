import {
  CLOSE_BRACE,
  CLOSE_BRACKET,
  COLON,
  COMMA,
  FALSE,
  NULL,
  OPEN_BRACE,
  OPEN_BRACKET,
  TRUE,
} from './consts.js';
import type { ProjectionPlanField } from './projection-plan.js';

export interface ObjectStringifyOptions {
  ignoredFields?: Set<string>;
}

/**
 * Fallback serializer for values that don't have a selection set (scalars, extensions, etc.)
 */
export function stringifyWithoutSelectionSet(
  value: unknown,
  objectOptions?: ObjectStringifyOptions,
): string {
  if (value == null) {
    return NULL;
  }
  if (Array.isArray(value)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < value.length; i++) {
      if (i > 0) {
        buf += COMMA;
      }
      buf += stringifyWithoutSelectionSet(value[i]);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  switch (typeof value) {
    case 'boolean':
      return value ? TRUE : FALSE;
    case 'bigint':
    case 'number':
      return String(value);
    case 'string':
      return stringifyString(value);
    case 'object': {
      if ((value as Record<string, unknown>)['toJSON']) {
        return stringifyWithoutSelectionSet(
          (value as { toJSON(): unknown }).toJSON(),
          objectOptions,
        );
      }
      let buf = OPEN_BRACE;
      let first = true;
      for (const key in value as object) {
        if (objectOptions?.ignoredFields?.has(key)) {
          continue;
        }
        if (!first) {
          buf += COMMA;
        }
        first = false;
        buf +=
          stringifyString(key) +
          COLON +
          stringifyWithoutSelectionSet((value as Record<string, unknown>)[key]);
      }
      buf += CLOSE_BRACE;
      return buf;
    }
    case 'symbol':
      return stringifyString(value.toString());
    case 'undefined':
      return NULL;
    case 'function':
      return NULL;
    default:
      throw new Error(`Unsupported value type: ${typeof value}`);
  }
}

export function stringifyString(value: string): string {
  // Fast path: scan for characters that require JSON escaping.
  // The vast majority of GraphQL response strings (identifiers, emails, UUIDs, etc.)
  // contain only plain ASCII without control characters, backslashes, or double-quotes.
  // For those we skip JSON.stringify entirely and just wrap in double-quotes.
  const len = value.length;
  for (let i = 0; i < len; i++) {
    const c = value.charCodeAt(i);
    // 0x20 = space (first printable ASCII char); 0x22 = '"'; 0x5c = '\\'
    if (c < 0x20 || c === 0x22 || c === 0x5c) {
      // Delegate to the engine – handles all control chars, Unicode surrogates, etc.
      return JSON.stringify(value);
    }
  }
  return '"' + value + '"';
}

// ---------------------------------------------------------------------------
// Plan-based projection: walks the pre-compiled plan and writes directly to
// a string buffer.  No intermediate Map allocations, no per-request schema
// lookups, no fragment resolution.
// ---------------------------------------------------------------------------

/**
 * Shared empty-variables object used when the operation has no variable definitions.
 * When `variables` is undefined, no plan field can have `hasSkip` or `hasInclude` set
 * (those require a `@skip(if: $var)` / `@include(if: $var)` directive which in turn
 * requires a declared operation variable).  We still pass a real object so the inner
 * functions keep a simple `Record<string, unknown>` signature and avoid per-access
 * null checks, but we reuse this constant instead of allocating `{}` on every call.
 */
const EMPTY_VARS: Record<string, unknown> = {};

/**
 * Serializes `data` according to the pre-compiled `fields` plan.
 * `variables` are the coerced operation variables used for @skip/@include evaluation.
 */
export function projectWithPlan(
  data: unknown,
  fields: ProjectionPlanField[],
  variables: Record<string, unknown> | undefined,
): string {
  return projectValue(data, fields, variables ?? EMPTY_VARS);
}

function projectValue(
  value: unknown,
  fields: ProjectionPlanField[],
  variables: Record<string, unknown>,
): string {
  if (value == null) return NULL;
  if (Array.isArray(value)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < value.length; i++) {
      if (i > 0) buf += COMMA;
      buf += projectValue(value[i], fields, variables);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  if (typeof value !== 'object') return NULL;
  return projectObject(value as Record<string, unknown>, fields, variables);
}

function projectObject(
  obj: Record<string, unknown>,
  fields: ProjectionPlanField[],
  variables: Record<string, unknown>,
): string {
  // Lazy __typename resolution: we only pay for the property lookup when at least one
  // field in the plan actually needs it (type guards or __typename output).
  // `undefined` means "not yet fetched"; `null` means "fetched but absent / not a string".
  let typename: string | null | undefined = undefined;

  let buf = OPEN_BRACE;
  let first = true;

  for (const field of fields) {
    // --- Type guard (lazy __typename lookup) ---
    if (field.typeGuard !== null) {
      if (typename === undefined) {
        const raw = obj['__typename'];
        typename = typeof raw === 'string' ? raw : null;
      }
      if (typename !== null && !field.typeGuard.has(typename)) {
        continue;
      }
    }

    // --- @skip / @include (use pre-computed boolean flags to avoid .length checks) ---
    if (field.hasSkip) {
      let skip = false;
      for (const v of field.skipIfVars) {
        if (variables[v] === true) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
    }
    if (field.hasInclude) {
      let exclude = false;
      for (const v of field.includeIfVars) {
        if (variables[v] === false) {
          exclude = true;
          break;
        }
      }
      if (exclude) continue;
    }

    if (!first) buf += COMMA;
    first = false;
    buf += field.escapedKey;

    if (field.isTypename) {
      // Ensure __typename is resolved before writing it.
      if (typename === undefined) {
        const raw = obj['__typename'];
        typename = typeof raw === 'string' ? raw : null;
      }
      if (typename === null) {
        const val = obj[field.responseKey];
        buf += typeof val === 'string' ? stringifyString(val) : NULL;
      } else {
        buf += stringifyString(typename);
      }
    } else if (field.children === null) {
      buf += projectLeafValue(obj[field.responseKey], field);
    } else {
      buf += projectValue(obj[field.responseKey], field.children, variables);
    }
  }

  buf += CLOSE_BRACE;
  return buf;
}

/**
 * Serializes a leaf (scalar or enum) field value using the fastest available path.
 * For well-known built-in scalars the `scalarHint` lets us skip the generic
 * `stringifyWithoutSelectionSet` dispatcher entirely.
 */
function projectLeafValue(value: unknown, field: ProjectionPlanField): string {
  if (field.enumValues !== null) {
    return projectEnumValue(value, field.enumValues);
  }
  switch (field.scalarHint) {
    case 'string':
      return typeof value === 'string' ? stringifyString(value) : NULL;
    case 'number':
      return typeof value === 'number' && isFinite(value)
        ? String(value)
        : typeof value === 'bigint'
          ? String(value)
          : NULL;
    case 'boolean':
      return value === true ? TRUE : value === false ? FALSE : NULL;
    case 'id':
      // GraphQL ID resolves to either a string or a numeric value.
      return typeof value === 'string'
        ? stringifyString(value)
        : typeof value === 'number'
          ? String(value)
          : NULL;
    default:
      // Custom scalar or unknown type: fall back to the generic serializer.
      return stringifyWithoutSelectionSet(value);
  }
}

/**
 * Serializes an enum value (or array of enum values), returning `null` for
 * values that are not in the pre-computed valid-value set.
 *
 * GraphQL enum values are identifiers (`[_A-Za-z][_0-9A-Za-z]*`) and therefore
 * never contain characters that require JSON escaping.  Once we verify membership
 * in `validValues` we can wrap in quotes directly without calling JSON.stringify.
 */
function projectEnumValue(value: unknown, validValues: ReadonlySet<string>): string {
  if (value == null) return NULL;
  if (Array.isArray(value)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < value.length; i++) {
      if (i > 0) buf += COMMA;
      buf += projectEnumValue(value[i], validValues);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  const str = String(value);
  // Enum identifiers are guaranteed to contain only [_A-Za-z0-9] characters so
  // we can safely wrap in double-quotes without any further escaping.
  return validValues.has(str) ? '"' + str + '"' : NULL;
}
