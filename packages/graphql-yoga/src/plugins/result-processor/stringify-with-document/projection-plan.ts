import {
  DocumentNode,
  FragmentDefinitionNode,
  getNamedType,
  getOperationAST,
  GraphQLEnumType,
  GraphQLNamedOutputType,
  GraphQLSchema,
  isAbstractType,
  isEnumType,
  Kind,
  SchemaMetaFieldDef,
  SelectionSetNode,
  TypeMetaFieldDef,
  VariableDefinitionNode,
} from 'graphql';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import { __SCHEMA_FIELD, __TYPE_FIELD, TYPENAME } from './consts.js';

/**
 * A single field in the pre-compiled projection plan.
 *
 * Every field is resolved once (at plan-compile time) and reused across requests.
 * At serialization time we only walk the plan and write directly to a string buffer.
 */
export interface ProjectionPlanField {
  /** Key used to read the value from the data object (alias if present, otherwise field name). */
  responseKey: string;
  /** Pre-escaped JSON fragment: `"responseKey":` – avoids per-request JSON.stringify of the key. */
  escapedKey: string;
  /** True when this field is the `__typename` meta-field. */
  isTypename: boolean;
  /**
   * Variable names whose true value causes this field to be skipped (@skip(if: $var)).
   * Empty array → no skip condition.  Multiple entries are ORed: skip if any is true.
   */
  skipIfVars: readonly string[];
  /**
   * Variable names whose false value causes this field to be excluded (@include(if: $var)).
   * Empty array → no include condition.  Multiple entries are ANDed: exclude if any is false.
   */
  includeIfVars: readonly string[];
  /**
   * The set of concrete __typename values for which this field is included.
   * null → no type restriction (always include when other conditions pass).
   * Populated by inline-fragment / fragment-spread type conditions, including abstract types
   * (the set is pre-expanded to all possible concrete implementations).
   */
  typeGuard: ReadonlySet<string> | null;
  /**
   * Pre-computed set of valid enum value names for enum-typed leaf fields.
   * null → field is not an enum (serialize as-is).
   */
  enumValues: ReadonlySet<string> | null;
  /**
   * Compiled sub-selections for object/interface/union fields.
   * null → leaf field (scalar / enum).
   */
  children: ProjectionPlanField[] | null;
}

/**
 * The compiled plan for one operation in a document.
 * Cached per (schema, document, operationName) triplet.
 */
export interface CompiledProjectionPlan {
  fields: ProjectionPlanField[];
  /**
   * Variable definitions from the operation AST, kept here so that
   * stringify-with-document.ts can run getVariableValues without re-parsing the document.
   */
  variableDefinitions: readonly VariableDefinitionNode[];
}

// ---------------------------------------------------------------------------
// Plan cache: WeakMap<schema, WeakMap<document, Map<operationName, plan>>>
// Using WeakMap so plans are released when schema or document objects are GC-ed.
// ---------------------------------------------------------------------------

const planCache = new WeakMap<
  GraphQLSchema,
  WeakMap<DocumentNode, Map<string | undefined, CompiledProjectionPlan | null>>
>();

/**
 * Returns the compiled projection plan for the given (schema, document, operationName).
 * The result is memoised: the first call builds the plan; subsequent calls return the cached copy.
 */
export function getOrCompileProjectionPlan(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | undefined,
): CompiledProjectionPlan | null {
  let byDoc = planCache.get(schema);
  if (!byDoc) {
    byDoc = new WeakMap();
    planCache.set(schema, byDoc);
  }
  let byOp = byDoc.get(document);
  if (!byOp) {
    byOp = new Map();
    byDoc.set(document, byOp);
  }
  if (byOp.has(operationName)) {
    return byOp.get(operationName) ?? null;
  }
  const plan = buildProjectionPlan(schema, document, operationName);
  byOp.set(operationName, plan);
  return plan;
}

// ---------------------------------------------------------------------------
// Plan compilation
// ---------------------------------------------------------------------------

function buildProjectionPlan(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | undefined,
): CompiledProjectionPlan | null {
  const operationAst = getOperationAST(document, operationName ?? null);
  if (!operationAst) return null;

  const rootType = schema.getRootType(operationAst.operation);
  if (!rootType) return null;

  const fragments = getFragmentsFromDocument(document);
  const fields = buildSelectionSet(
    operationAst.selectionSet,
    rootType.name,
    schema,
    fragments,
    /* parentTypeGuard */ null,
    /* inheritedSkipIfVars */ EMPTY_STRINGS,
    /* inheritedIncludeIfVars */ EMPTY_STRINGS,
  );

  return {
    fields,
    variableDefinitions: operationAst.variableDefinitions ?? EMPTY_VARIABLE_DEFS,
  };
}

// Stable empty arrays shared across all plans – avoids repeated allocations.
const EMPTY_STRINGS: readonly string[] = [];
const EMPTY_VARIABLE_DEFS: readonly VariableDefinitionNode[] = [];

// ---------------------------------------------------------------------------
// Type-guard helpers
// ---------------------------------------------------------------------------

/**
 * Returns the set of concrete type names that satisfy the given type condition.
 * For object types the set contains just the type name itself.
 * For interface / union types the set is expanded to all possible concrete implementations.
 */
function getPossibleTypeNames(schema: GraphQLSchema, typeName: string): ReadonlySet<string> {
  const type = schema.getType(typeName);
  if (!type) return new Set([typeName]);
  if (isAbstractType(type)) {
    return new Set(schema.getPossibleTypes(type).map(t => t.name));
  }
  return new Set([typeName]);
}

function intersectGuards(
  a: ReadonlySet<string> | null,
  b: ReadonlySet<string> | null,
): ReadonlySet<string> | null {
  if (a === null) return b;
  if (b === null) return a;
  const out = new Set<string>();
  for (const t of a) {
    if (b.has(t)) out.add(t);
  }
  return out;
}

function unionGuards(
  a: ReadonlySet<string> | null,
  b: ReadonlySet<string> | null,
): ReadonlySet<string> | null {
  if (a === null || b === null) return null; // null means "unrestricted"
  return new Set<string>([...a, ...b]);
}

// ---------------------------------------------------------------------------
// Directive extraction
// ---------------------------------------------------------------------------

interface DirectiveInfo {
  skipIfVars: readonly string[];
  includeIfVars: readonly string[];
  literalSkip: boolean;
}

type DirectiveLike = readonly {
  name: { value: string };
  arguments?: readonly {
    name: { value: string };
    value: { kind: string; name?: { value: string }; value?: unknown };
  }[];
}[];

function extractDirectives(
  directives: DirectiveLike | undefined,
  inheritedSkipIfVars: readonly string[],
  inheritedIncludeIfVars: readonly string[],
): DirectiveInfo {
  let skipIfVars: string[] | null = null;
  let includeIfVars: string[] | null = null;
  let literalSkip = false;

  if (directives?.length) {
    for (const d of directives) {
      const ifArg = d.arguments?.find(a => a.name.value === 'if');
      if (!ifArg) continue;
      if (d.name.value === 'skip') {
        if (ifArg.value.kind === Kind.VARIABLE) {
          (skipIfVars ??= []).push((ifArg.value as { name: { value: string } }).name.value);
        } else if (ifArg.value.kind === Kind.BOOLEAN && ifArg.value.value === true) {
          literalSkip = true;
        }
      } else if (d.name.value === 'include') {
        if (ifArg.value.kind === Kind.VARIABLE) {
          (includeIfVars ??= []).push((ifArg.value as { name: { value: string } }).name.value);
        } else if (ifArg.value.kind === Kind.BOOLEAN && ifArg.value.value === false) {
          literalSkip = true;
        }
      }
    }
  }

  // Combine with inherited conditions from enclosing fragments
  const combinedSkipIfVars: readonly string[] =
    inheritedSkipIfVars.length === 0 && skipIfVars === null
      ? EMPTY_STRINGS
      : [...inheritedSkipIfVars, ...(skipIfVars ?? [])];

  const combinedIncludeIfVars: readonly string[] =
    inheritedIncludeIfVars.length === 0 && includeIfVars === null
      ? EMPTY_STRINGS
      : [...inheritedIncludeIfVars, ...(includeIfVars ?? [])];

  return {
    skipIfVars: combinedSkipIfVars,
    includeIfVars: combinedIncludeIfVars,
    literalSkip,
  };
}

// ---------------------------------------------------------------------------
// Field merging (same response key appearing in multiple fragments)
// ---------------------------------------------------------------------------

function mergeField(
  existing: ProjectionPlanField,
  incoming: ProjectionPlanField,
): ProjectionPlanField {
  // When the same response key is reached through two separate paths, include the field if
  // either path's conditions allow it.
  //
  // skip: if one path has no skip condition it always includes the field, so the merged
  // result must also always include it (empty wins over any variable list).
  // When both paths carry skip variables they are unioned: the field is skipped if any
  // variable in either path requests a skip.  This is a conservative approximation for the
  // rare case where the same response key appears in multiple type-conditioned fragments
  // with different @skip variables; the alternative (intersection) would silently ignore
  // individual skip directives when they don't overlap.
  const skipIfVars =
    existing.skipIfVars.length === 0 || incoming.skipIfVars.length === 0
      ? EMPTY_STRINGS
      : dedupe([...existing.skipIfVars, ...incoming.skipIfVars]);

  // include: symmetric – if one path has no include-guard it always includes the field,
  // so the merged result must also always include it.
  const includeIfVars =
    existing.includeIfVars.length === 0 || incoming.includeIfVars.length === 0
      ? EMPTY_STRINGS
      : dedupe([...existing.includeIfVars, ...incoming.includeIfVars]);

  let children: ProjectionPlanField[] | null = null;
  if (existing.children !== null || incoming.children !== null) {
    children = mergeFieldLists(existing.children ?? [], incoming.children ?? []);
  }

  // For enum values: union of valid values; if either side has no restriction, clear it.
  let enumValues: ReadonlySet<string> | null = null;
  if (existing.enumValues !== null && incoming.enumValues !== null) {
    enumValues = new Set([...existing.enumValues, ...incoming.enumValues]);
  }

  return {
    responseKey: existing.responseKey,
    escapedKey: existing.escapedKey,
    isTypename: existing.isTypename || incoming.isTypename,
    skipIfVars,
    includeIfVars,
    typeGuard: unionGuards(existing.typeGuard, incoming.typeGuard),
    enumValues,
    children,
  };
}

function mergeFieldLists(
  a: ProjectionPlanField[],
  b: ProjectionPlanField[],
): ProjectionPlanField[] {
  const map = new Map<string, ProjectionPlanField>();
  for (const f of a) map.set(f.responseKey, f);
  for (const f of b) {
    const ex = map.get(f.responseKey);
    map.set(f.responseKey, ex ? mergeField(ex, f) : f);
  }
  return [...map.values()];
}

function dedupe(arr: string[]): readonly string[] {
  return [...new Set(arr)];
}

// ---------------------------------------------------------------------------
// Core plan builder
// ---------------------------------------------------------------------------

function buildSelectionSet(
  selectionSet: SelectionSetNode,
  parentTypeName: string,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  parentTypeGuard: ReadonlySet<string> | null,
  inheritedSkipIfVars: readonly string[],
  inheritedIncludeIfVars: readonly string[],
): ProjectionPlanField[] {
  const fields = new Map<string, ProjectionPlanField>();

  for (const selection of selectionSet.selections) {
    const { skipIfVars, includeIfVars, literalSkip } = extractDirectives(
      selection.directives as DirectiveLike | undefined,
      inheritedSkipIfVars,
      inheritedIncludeIfVars,
    );
    if (literalSkip) continue;

    switch (selection.kind) {
      case Kind.FIELD: {
        const fieldName = selection.name.value;
        const responseKey = selection.alias?.value ?? fieldName;

        if (fieldName === TYPENAME) {
          const field: ProjectionPlanField = {
            responseKey,
            escapedKey: JSON.stringify(responseKey) + ':',
            isTypename: true,
            skipIfVars,
            includeIfVars,
            typeGuard: parentTypeGuard,
            enumValues: null,
            children: null,
          };
          const existing = fields.get(responseKey);
          fields.set(responseKey, existing ? mergeField(existing, field) : field);
          break;
        }

        // Resolve field return type from schema.
        let fieldType: GraphQLNamedOutputType | undefined;
        if (fieldName === __SCHEMA_FIELD) {
          fieldType = getNamedType(SchemaMetaFieldDef.type) as GraphQLNamedOutputType;
        } else if (fieldName === __TYPE_FIELD) {
          fieldType = getNamedType(TypeMetaFieldDef.type) as GraphQLNamedOutputType;
        } else {
          const parentSchemaType = schema.getType(parentTypeName);
          if (parentSchemaType && 'getFields' in parentSchemaType) {
            const fieldDef = (
              parentSchemaType as { getFields(): Record<string, { type: unknown }> }
            ).getFields()[fieldName];
            if (fieldDef) {
              fieldType = getNamedType(
                fieldDef.type as Parameters<typeof getNamedType>[0],
              ) as GraphQLNamedOutputType;
            }
          }
        }

        // Unknown field: skip to avoid including unexpected data (security invariant).
        if (!fieldType) continue;

        const enumValues: ReadonlySet<string> | null = isEnumType(fieldType)
          ? new Set((fieldType as GraphQLEnumType).getValues().map(v => v.name))
          : null;

        const children = selection.selectionSet
          ? buildSelectionSet(
              selection.selectionSet,
              fieldType.name,
              schema,
              fragments,
              /* parentTypeGuard */ null,
              /* inherited skip/include reset for child scope */ EMPTY_STRINGS,
              EMPTY_STRINGS,
            )
          : null;

        const field: ProjectionPlanField = {
          responseKey,
          escapedKey: JSON.stringify(responseKey) + ':',
          isTypename: false,
          skipIfVars,
          includeIfVars,
          typeGuard: parentTypeGuard,
          enumValues,
          children,
        };
        const existing = fields.get(responseKey);
        fields.set(responseKey, existing ? mergeField(existing, field) : field);
        break;
      }

      case Kind.INLINE_FRAGMENT: {
        let fragmentTypeGuard: ReadonlySet<string> | null = null;
        let fragmentTypeName = parentTypeName;

        if (selection.typeCondition) {
          fragmentTypeGuard = getPossibleTypeNames(schema, selection.typeCondition.name.value);
          fragmentTypeName = selection.typeCondition.name.value;
        }

        const effectiveGuard = intersectGuards(parentTypeGuard, fragmentTypeGuard);

        const fragmentFields = buildSelectionSet(
          selection.selectionSet,
          fragmentTypeName,
          schema,
          fragments,
          effectiveGuard,
          // Pass any variable directives on this fragment down to its fields.
          skipIfVars,
          includeIfVars,
        );

        for (const f of fragmentFields) {
          const existing = fields.get(f.responseKey);
          fields.set(f.responseKey, existing ? mergeField(existing, f) : f);
        }
        break;
      }

      case Kind.FRAGMENT_SPREAD: {
        const fragmentDef = fragments[selection.name.value];
        if (!fragmentDef) break;

        const fragmentTypeGuard = getPossibleTypeNames(
          schema,
          fragmentDef.typeCondition.name.value,
        );
        const effectiveGuard = intersectGuards(parentTypeGuard, fragmentTypeGuard);

        const fragmentFields = buildSelectionSet(
          fragmentDef.selectionSet,
          fragmentDef.typeCondition.name.value,
          schema,
          fragments,
          effectiveGuard,
          skipIfVars,
          includeIfVars,
        );

        for (const f of fragmentFields) {
          const existing = fields.get(f.responseKey);
          fields.set(f.responseKey, existing ? mergeField(existing, f) : f);
        }
        break;
      }
    }
  }

  return [...fields.values()];
}
