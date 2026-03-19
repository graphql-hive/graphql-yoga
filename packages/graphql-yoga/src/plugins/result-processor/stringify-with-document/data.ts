import {
  getNamedType,
  GraphQLEnumType,
  GraphQLNamedOutputType,
  isAbstractType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  Kind,
  SchemaMetaFieldDef,
  SelectionSetNode,
  TypeMetaFieldDef,
} from 'graphql';
import {
  __SCHEMA_FIELD,
  __TYPE_FIELD,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  COLON,
  COMMA,
  FALSE,
  NULL,
  OPEN_BRACE,
  OPEN_BRACKET,
  TRUE,
  TYPENAME,
} from './consts.js';
import { StringifyContext } from './stringify-with-document.js';

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

/**
 * Determines whether an object satisfies a type condition, returning the resolved type.
 */
function objectSatisfiesTypeCondition(
  stringifyContext: StringifyContext,
  typeCondition: string,
  parentType?: GraphQLNamedOutputType,
): GraphQLNamedOutputType | undefined {
  if (typeCondition === parentType?.name) {
    return parentType;
  }
  const typeConditionType = stringifyContext.schema.getType(typeCondition) as
    | GraphQLNamedOutputType
    | undefined;
  if (typeConditionType == null) {
    return undefined;
  }
  if (parentType?.name == null) {
    return typeConditionType;
  }
  const typeConditionAbstract = isAbstractType(typeConditionType);
  const parentTypeAbstract = isAbstractType(parentType);
  if (
    typeConditionAbstract &&
    (isObjectType(parentType) || isInterfaceType(parentType)) &&
    stringifyContext.schema.isSubType(typeConditionType, parentType)
  ) {
    return parentType;
  }
  if (
    parentTypeAbstract &&
    (isObjectType(typeConditionType) || isInterfaceType(typeConditionType)) &&
    stringifyContext.schema.isSubType(parentType, typeConditionType)
  ) {
    return typeConditionType;
  }
  if (parentTypeAbstract) {
    return typeConditionType;
  }
  return undefined;
}

// Internal representation before converting to string
type StringifyResult = Map<string, StringifyResult> | StringifyResult[] | string;

function mergeResults(a: StringifyResult, b: StringifyResult): StringifyResult {
  if (a instanceof Map && b instanceof Map) {
    const merged = new Map<string, StringifyResult>(a);
    for (const [key, val] of b) {
      const existing = merged.get(key);
      if (existing == null) {
        merged.set(key, val);
      } else {
        merged.set(key, mergeResults(existing, val));
      }
    }
    return merged;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const merged: StringifyResult[] = [...a];
    for (let i = 0; i < b.length; i++) {
      const item = b[i]!;
      const existing = merged[i];
      if (existing == null) {
        merged[i] = item;
      } else {
        merged[i] = mergeResults(existing, item);
      }
    }
    return merged;
  }
  // If types differ or one is a string (scalar), prefer whichever is non-null
  if (typeof b === 'string' && b !== NULL) {
    return b;
  }
  return a;
}

export function resultToString(result: StringifyResult): string {
  if (Array.isArray(result)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < result.length; i++) {
      if (i > 0) {
        buf += COMMA;
      }
      buf += resultToString(result[i]!);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  if (result instanceof Map) {
    let buf = OPEN_BRACE;
    let first = true;
    for (const [key, value] of result) {
      if (!first) {
        buf += COMMA;
      }
      first = false;
      buf += stringifyString(key) + COLON + resultToString(value);
    }
    buf += CLOSE_BRACE;
    return buf;
  }
  return result;
}

/**
 * Checks whether a directive with @skip or @include should skip/include this selection.
 * Returns true if the selection should be skipped.
 */
function shouldSkipSelection(
  directives: readonly {
    name: { value: string };
    arguments?: readonly {
      name: { value: string };
      value: { kind: string; name?: { value: string }; value?: unknown };
    }[];
  }[],
  variables: Record<string, unknown> | undefined,
): boolean {
  for (const directive of directives) {
    if (directive.name.value === 'skip') {
      const ifArg = directive.arguments?.find(a => a.name.value === 'if');
      if (ifArg) {
        const ifValue = ifArg.value;
        let shouldSkip: boolean | undefined;
        if (ifValue.kind === Kind.VARIABLE) {
          shouldSkip = variables?.[
            (ifValue as { kind: string; name: { value: string } }).name.value
          ] as boolean | undefined;
        } else if (ifValue.kind === Kind.BOOLEAN) {
          shouldSkip = ifValue.value as boolean;
        }
        if (shouldSkip) return true;
      }
    } else if (directive.name.value === 'include') {
      const ifArg = directive.arguments?.find(a => a.name.value === 'if');
      if (ifArg) {
        const ifValue = ifArg.value;
        let shouldInclude: boolean | undefined;
        if (ifValue.kind === Kind.VARIABLE) {
          shouldInclude = variables?.[
            (ifValue as { kind: string; name: { value: string } }).name.value
          ] as boolean | undefined;
        } else if (ifValue.kind === Kind.BOOLEAN) {
          shouldInclude = ifValue.value as boolean;
        }
        if (shouldInclude === false) return true;
      }
    }
  }
  return false;
}

export function stringifyWithSelectionSet(
  object: unknown,
  selectionSet: SelectionSetNode,
  stringifyContext: StringifyContext,
  parentTypeFallback?: GraphQLNamedOutputType,
): StringifyResult {
  if (object == null) {
    return NULL;
  }
  if (Array.isArray(object)) {
    return object.map(item => {
      let itemType = parentTypeFallback;
      if (item != null && typeof item === 'object') {
        const typename = (item as Record<string, unknown>)['__typename'];
        if (typeof typename === 'string') {
          const t = stringifyContext.schema.getType(typename) as GraphQLNamedOutputType | undefined;
          if (t) itemType = t;
        }
      }
      return stringifyWithSelectionSet(item, selectionSet, stringifyContext, itemType);
    });
  }

  const obj = object as Record<string, unknown>;
  let map = new Map<string, StringifyResult>();
  let parentType = parentTypeFallback;

  // Determine concrete type from __typename if available
  if (typeof obj['__typename'] === 'string') {
    const t = stringifyContext.schema.getType(obj['__typename']) as
      | GraphQLNamedOutputType
      | undefined;
    if (t) parentType = t;
  }

  for (const selection of selectionSet.selections) {
    if (
      selection.directives?.length &&
      shouldSkipSelection(
        selection.directives as Parameters<typeof shouldSkipSelection>[0],
        stringifyContext.variables,
      )
    ) {
      continue;
    }

    switch (selection.kind) {
      case Kind.FIELD: {
        const fieldName = selection.name.value;
        const responseKey = selection.alias ? selection.alias.value : fieldName;
        const value = obj[responseKey];

        if (fieldName === TYPENAME) {
          // __typename: use the resolved concrete type name or the value from data
          if (parentType && !isAbstractType(parentType)) {
            map.set(responseKey, stringifyString(parentType.name));
          } else if (typeof value === 'string') {
            map.set(responseKey, stringifyString(value));
          }
          continue;
        }

        let fieldType: GraphQLNamedOutputType | undefined;

        // Try to get type from value's __typename
        if (value != null && typeof value === 'object') {
          const vTypename = (value as Record<string, unknown>)['__typename'];
          if (typeof vTypename === 'string') {
            fieldType = stringifyContext.schema.getType(vTypename) as
              | GraphQLNamedOutputType
              | undefined;
          }
        }

        // Fall back to looking up the field in the parent type's fields
        if (!fieldType && parentType) {
          if (fieldName === __SCHEMA_FIELD) {
            fieldType = getNamedType(SchemaMetaFieldDef.type) as GraphQLNamedOutputType;
          } else if (fieldName === __TYPE_FIELD) {
            fieldType = getNamedType(TypeMetaFieldDef.type) as GraphQLNamedOutputType;
          } else if ('getFields' in parentType) {
            const fieldDef = (
              parentType as { getFields(): Record<string, { type: unknown }> }
            ).getFields()[fieldName];
            if (fieldDef) {
              fieldType = getNamedType(
                fieldDef.type as Parameters<typeof getNamedType>[0],
              ) as GraphQLNamedOutputType;
            }
          }
        }

        if (!fieldType) {
          // Unknown field: skip to avoid including unexpected data
          continue;
        }

        if (selection.selectionSet) {
          const nested = stringifyWithSelectionSet(
            value,
            selection.selectionSet,
            stringifyContext,
            fieldType,
          );
          const existing = map.get(responseKey);
          map.set(responseKey, existing == null ? nested : mergeResults(existing, nested));
        } else if (isEnumType(fieldType)) {
          const serializeEnumValue = (enumType: GraphQLEnumType, v: unknown): string => {
            if (v == null) return NULL;
            return enumType.getValue(String(v)) == null ? NULL : stringifyWithoutSelectionSet(v);
          };
          if (Array.isArray(value)) {
            map.set(
              responseKey,
              value.map(v => serializeEnumValue(fieldType as GraphQLEnumType, v)),
            );
          } else {
            map.set(responseKey, serializeEnumValue(fieldType as GraphQLEnumType, value));
          }
        } else {
          map.set(responseKey, stringifyWithoutSelectionSet(value));
        }
        break;
      }

      case Kind.INLINE_FRAGMENT: {
        let resolvedType = parentType;
        if (selection.typeCondition) {
          resolvedType = objectSatisfiesTypeCondition(
            stringifyContext,
            selection.typeCondition.name.value,
            parentType,
          );
          if (!resolvedType) continue;
        }
        const fragmentResult = stringifyWithSelectionSet(
          object,
          selection.selectionSet,
          stringifyContext,
          resolvedType,
        );
        if (fragmentResult !== NULL) {
          map = mergeResults(map, fragmentResult) as Map<string, StringifyResult>;
        }
        break;
      }

      case Kind.FRAGMENT_SPREAD: {
        const fragmentDef = stringifyContext.fragments[selection.name.value];
        if (!fragmentDef) break;
        const resolvedType = objectSatisfiesTypeCondition(
          stringifyContext,
          fragmentDef.typeCondition.name.value,
          parentType,
        );
        if (!resolvedType) continue;
        const fragmentResult = stringifyWithSelectionSet(
          object,
          fragmentDef.selectionSet,
          stringifyContext,
          resolvedType,
        );
        if (fragmentResult !== NULL) {
          map = mergeResults(map, fragmentResult) as Map<string, StringifyResult>;
        }
        break;
      }
    }
  }

  return map;
}
