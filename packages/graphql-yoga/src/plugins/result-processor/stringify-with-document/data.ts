import { FragmentDefinitionNode, getNamedType, GraphQLEnumType, GraphQLEnumValue, GraphQLNamedOutputType, isAbstractType, isEnumType, isInterfaceType, isObjectType, Kind, SchemaMetaFieldDef, SelectionSetNode, TypeMetaFieldDef } from 'graphql';
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
  QUOTE,
  TRUE,
  TYPENAME,
} from './consts.js';
import { StringifyContext } from './stringify-with-document.js';
import { collectFields } from '@graphql-tools/utils';

export interface ObjectStringifyOptions {
  ignoredFields?: Set<string>;
}

export function stringifyWithoutSelectionSet(
  value: any, 
  objectOptions?: ObjectStringifyOptions,
): string {
  if (value == null) {
    return NULL;
  }
  if (Array.isArray(value)) {
    let buf = '';
    buf += OPEN_BRACKET;
    for (let i = 0; i < value.length; i++) {
      if (i > 0) {
        buf += ',';
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
      if (value.toJSON) {
        return stringifyWithoutSelectionSet(value.toJSON(), objectOptions);
      }
      let buf = '';
        buf += OPEN_BRACE;
      let first = true;
      for (const key in value) {
        if (objectOptions?.ignoredFields?.has(key)) {
          continue;
        }
        if (!first) {
          buf += COMMA;
        }
        first = false;
        buf += stringifyString(key) + COLON + stringifyWithoutSelectionSet(value[key]);
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

function objectSatisfiesTypeCondition(
  stringifyContext: StringifyContext,
  typeCondition: string,
  parentType?: GraphQLNamedOutputType
): GraphQLNamedOutputType | undefined {
  if (typeCondition === parentType?.name) {
    return parentType;
  }
  const typeConditionType = stringifyContext.schema.getType(typeCondition) as GraphQLNamedOutputType | undefined;
  if (typeConditionType == null) {
    return undefined;
  }
  if (parentType?.name == null) {
    return typeConditionType;
  }
  const typeConditionAbstract = isAbstractType(typeConditionType);
  const parentTypeAbstract = isAbstractType(parentType);
  if (typeConditionAbstract && (isObjectType(parentType) || isInterfaceType(parentType)) && stringifyContext.schema.isSubType(typeConditionType, parentType)) {
    return parentType;
  }
  if (parentTypeAbstract && (isObjectType(typeConditionType) || isInterfaceType(typeConditionType)) && stringifyContext.schema.isSubType(parentType, typeConditionType)) {
    return typeConditionType;
  }
  if (parentTypeAbstract) {
    return typeConditionType;
  }
  return undefined;
}

type StringifyWithSelectionSetResult = Map<string, StringifyWithSelectionSetResult> | StringifyWithSelectionSetResult[] | string;

function mergeStringifyWithSelectionSetResults(results: StringifyWithSelectionSetResult[]): StringifyWithSelectionSetResult {
  if (results.length === 0) {
    return NULL;
  }
  if (results.length === 1) {
    return results[0]!;
  }
  let mergedArr: StringifyWithSelectionSetResult[] | undefined;
  let mergedMap: Map<string, StringifyWithSelectionSetResult> | undefined;
  let strResult: string = NULL;
  for (const result of results) {
    if (Array.isArray(result)) {
      mergedArr ||= [];
      for (let i = 0; i < result.length; i++) {
        const item = result[i]!;
        if (item == null) {
          continue;
        }
        const existingItem = mergedArr[i];
        if (existingItem) {
          mergedArr[i] = mergeStringifyWithSelectionSetResults([existingItem, item]);
        } else {
          if (!mergedArr) {
            mergedArr = [];
          }
          mergedArr[i] = item;
        }
      }
    } else if (result instanceof Map) {
      mergedMap ||= new Map<string, StringifyWithSelectionSetResult>();
      if (result.size === 0) {
        continue;
      }
      for (const [key, value] of result.entries()) {
        const existingValue = mergedMap?.get(key);
        if (existingValue) {
          mergedMap.set(key, mergeStringifyWithSelectionSetResults([existingValue, value]));
        } else {
          if (!mergedMap) {
            mergedMap = new Map<string, StringifyWithSelectionSetResult>();
          }
          mergedMap.set(key, value);
        }
      }
    } else if (typeof result === 'string') {
      // If there is a string result, it means there was a conflict that couldn't be merged, so we return the string result directly.
      if (result !== NULL) {
        return result;
      }
    }
  }
  if (mergedArr) {
    return mergedArr;
  }
  if (mergedMap) {
    return mergedMap;
  }
  return strResult;
}

export function stringifyResultToString(
  result: StringifyWithSelectionSetResult,
): string {
  if (Array.isArray(result)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < result.length; i++) {
      if (i > 0) {
        buf += COMMA;
      }
      buf += stringifyResultToString(result[i]!);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  if (result instanceof Map) {
    let buf = OPEN_BRACE;
    let first = true;
    for (const [key, value] of result.entries()) {
      if (!first) {
        buf += COMMA;
      }
      first = false;
      buf += stringifyString(key) + COLON + stringifyResultToString(value);
    }
    buf += CLOSE_BRACE;
    return buf;
  }
  return result;
}

export function stringifyWithSelectionSet(
  object: any,
  selectionSet: SelectionSetNode,
  stringifyContext: StringifyContext,
  parentTypeFallback?: GraphQLNamedOutputType,
): StringifyWithSelectionSetResult {
  if (object == null) {
    return NULL;
  }
  if (Array.isArray(object)) {
    return object.map((item) => {
      let itemType = parentTypeFallback;
      if (item?.__typename) {
        const parentTypeFromSchema = stringifyContext.schema.getType(item.__typename) as GraphQLNamedOutputType;
        if (parentTypeFromSchema) {
          itemType = parentTypeFromSchema;
        }
      }
      return stringifyWithSelectionSet(item, selectionSet, stringifyContext, itemType);
    });
  }
  let map = new Map<string, StringifyWithSelectionSetResult>();
  let parentType = parentTypeFallback;
  if (object.__typename) {
    const parentTypeFromSchema = stringifyContext.schema.getType(object.__typename) as GraphQLNamedOutputType;
    if (parentTypeFromSchema) {
      parentType = parentTypeFromSchema;
    }
  }
  for (const selection of selectionSet.selections) {
    const skipDirective = selection.directives?.find((directive) => directive.name.value === 'skip');
    if (skipDirective) {
      const ifArgument = skipDirective.arguments?.find((arg) => arg.name.value === 'if');
      if (ifArgument) {
        const ifValue = ifArgument.value;
        let shouldSkip: boolean | undefined;
        if (ifValue.kind === Kind.VARIABLE) {
          const variableName = ifValue.name.value;
          shouldSkip = stringifyContext.variables?.[variableName];
        } else if (ifValue.kind === Kind.BOOLEAN) {
          shouldSkip = ifValue.value;
        }
        if (shouldSkip) {
          continue;
        }
      }
    }
    const includeDirective = selection.directives?.find((directive) => directive.name.value === 'include');
    if (includeDirective) {
      const ifArgument = includeDirective.arguments?.find((arg) => arg.name.value === 'if');
      if (ifArgument) {
        const ifValue = ifArgument.value;
        let shouldInclude: boolean | undefined;
        if (ifValue.kind === Kind.VARIABLE) {
          const variableName = ifValue.name.value;
          shouldInclude = stringifyContext.variables?.[variableName];
        } else if (ifValue.kind === Kind.BOOLEAN) {
          shouldInclude = ifValue.value;
        }
        if (!shouldInclude) {
          continue;
        }
      }
    }
    switch (selection.kind) {
      case Kind.FIELD: {
        const fieldName = selection.name.value;
        const responseKey = selection.alias ? selection.alias.value : selection.name.value;
        const value = object[responseKey];
        if (fieldName === TYPENAME && parentType) {
          if (isAbstractType(parentType)) {
            return NULL;
          }
          map.set(responseKey, stringifyString(parentType.name));
          continue;
        }
        let fieldType: GraphQLNamedOutputType | undefined;
        if (value?.__typename) {
          fieldType = stringifyContext.schema.getType(value.__typename) as GraphQLNamedOutputType;
        }
        if (parentType && !fieldType) {
          if ('getFields' in parentType) {
            const fields = parentType.getFields();
            let fieldDef = fields[fieldName];
            if (fieldName === __SCHEMA_FIELD) {
              fieldDef = SchemaMetaFieldDef;
            } else if (fieldName === __TYPE_FIELD) {
              fieldDef = TypeMetaFieldDef;
            }
            if (fieldDef) {
              fieldType = getNamedType(fieldDef.type);
            }
          }
        }
        if (!fieldType) {
          continue;
        }
        if (selection.selectionSet) {
          const res = stringifyWithSelectionSet(value, selection.selectionSet, stringifyContext, fieldType);
          const existingValue = map.get(responseKey);
          if (existingValue != null) {
            map.set(responseKey, mergeStringifyWithSelectionSetResults([existingValue, res]));
          } else {
            map.set(responseKey, res);
          }
        } else if (isEnumType(fieldType)) {
          function handleEnumValue(enumType: GraphQLEnumType, v: any): string {
            if (v == null) {
              return NULL;
            }
            const enumValue = enumType.getValue(v);
            return enumValue != null ? stringifyWithoutSelectionSet(v) : NULL;
          }
          if (Array.isArray(value)) {
            map.set(responseKey, value.map((v) => handleEnumValue(fieldType as GraphQLEnumType, v)));
          } else {
            map.set(responseKey, handleEnumValue(fieldType as GraphQLEnumType, value));
          }
        } else {
          map.set(responseKey, stringifyWithoutSelectionSet(value));
        }
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        const typeCondition = selection.typeCondition?.name.value;
        if (typeCondition) {
          parentType = objectSatisfiesTypeCondition(stringifyContext, typeCondition, parentTypeFallback);
          if (!parentType) {
            continue;
          }
        }
        const selectionSet = selection.selectionSet;
        const fragmentBuf = stringifyWithSelectionSet(object, selectionSet, stringifyContext, parentType);
        if (fragmentBuf !== NULL) {
          map = mergeStringifyWithSelectionSetResults([map, fragmentBuf]) as Map<string, StringifyWithSelectionSetResult>;
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragmentName = selection.name.value;
        const fragmentDef = stringifyContext.fragments[fragmentName];
        if (fragmentDef) {
          const typeCondition = fragmentDef.typeCondition.name.value;
          if (typeCondition) {
            parentType = objectSatisfiesTypeCondition(stringifyContext, typeCondition, parentTypeFallback);
            if (!parentType) {
              continue;
            }
          }
          const fragmentBuf = stringifyWithSelectionSet(object, fragmentDef.selectionSet, stringifyContext, parentType);
          if (fragmentBuf !== NULL) {
            map = mergeStringifyWithSelectionSetResults([map, fragmentBuf]) as Map<string, StringifyWithSelectionSetResult>;
          }
        }
        break;
      }
    }
  }
  return map;
}
