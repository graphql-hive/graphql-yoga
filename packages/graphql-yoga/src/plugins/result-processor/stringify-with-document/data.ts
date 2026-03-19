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
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Plan-based projection: walks the pre-compiled plan and writes directly to
// a string buffer.  No intermediate Map allocations, no per-request schema
// lookups, no fragment resolution.
// ---------------------------------------------------------------------------

/**
 * Serializes `data` according to the pre-compiled `fields` plan.
 * `variables` are the coerced operation variables used for @skip/@include evaluation.
 */
export function projectWithPlan(
  data: unknown,
  fields: ProjectionPlanField[],
  variables: Record<string, unknown> | undefined,
): string {
  return projectValue(data, fields, variables ?? {});
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
  const typenameRaw = obj['__typename'];
  const typename = typeof typenameRaw === 'string' ? typenameRaw : null;

  let buf = OPEN_BRACE;
  let first = true;

  for (const field of fields) {
    // --- Type guard ---
    // When __typename is known, skip fields whose type guard does not match.
    // When __typename is absent (e.g. from a custom executor that omits it),
    // be permissive and include all type-guarded fields.
    if (field.typeGuard !== null && typename !== null && !field.typeGuard.has(typename)) {
      continue;
    }

    // --- @skip / @include ---
    if (field.skipIfVars.length > 0) {
      let skip = false;
      for (const v of field.skipIfVars) {
        if (variables[v] === true) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
    }
    if (field.includeIfVars.length > 0) {
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
      if (typename === null) {
        const val = obj[field.responseKey];
        buf += typeof val === 'string' ? stringifyString(val) : NULL;
      } else {
        buf += stringifyString(typename);
      }
    } else if (field.children !== null) {
      buf += projectValue(obj[field.responseKey], field.children, variables);
    } else if (field.enumValues === null) {
      buf += stringifyWithoutSelectionSet(obj[field.responseKey]);
    } else {
      buf += projectEnumValue(obj[field.responseKey], field.enumValues);
    }
  }

  buf += CLOSE_BRACE;
  return buf;
}

/**
 * Serializes an enum value (or array of enum values), returning `null` for
 * values that are not in the pre-computed valid-value set.
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
  return validValues.has(str) ? stringifyWithoutSelectionSet(value) : NULL;
}
