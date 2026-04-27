import type { ArgumentNode, GraphQLType, ValidationContext } from 'graphql';
import {
  getNamedType,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLNonNull,
  isListType,
} from 'graphql';
import { createGraphQLError, getArgumentValues } from '@graphql-tools/utils';
import type { ExtendedValidationRule } from '../common.js';
import { getDirectiveFromAstNode } from '../common.js';

export const ONE_OF_DIRECTIVE_SDL = /* GraphQL */ `
  directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
`;

type VariableValue =
  | null
  | undefined
  | string
  | number
  | VariableValue[]
  | { [key: string]: VariableValue };

export const OneOfInputObjectsRule: ExtendedValidationRule = (validationContext, executionArgs) => {
  return {
    Field: node => {
      if (node.arguments?.length) {
        const fieldType = validationContext.getFieldDef();

        if (!fieldType) {
          return;
        }

        const values = getArgumentValues(
          fieldType,
          node,
          executionArgs.variableValues || undefined,
        );

        const isOneOfFieldType =
          fieldType.extensions?.['oneOf'] ||
          (fieldType.astNode && getDirectiveFromAstNode(fieldType.astNode, 'oneOf'));

        if (isOneOfFieldType && Object.keys(values).length !== 1) {
          validationContext.reportError(
            new GraphQLError(
              `Exactly one key must be specified for input for field "${fieldType.type.toString()}.${
                node.name.value
              }"`,
              [node],
            ),
          );
        }

        for (const arg of node.arguments) {
          const argType = fieldType.args.find(typeArg => typeArg.name === arg.name.value);
          if (argType) {
            traverseVariables(
              validationContext,
              arg,
              argType.type,
              values[arg.name.value] as VariableValue,
            );
          }
        }
      }
    },
  };
};

function getNonNullType(ttype: GraphQLType) {
  if (ttype instanceof GraphQLNonNull) {
    return ttype.ofType;
  }
  return ttype;
}

function traverseVariables(
  validationContext: ValidationContext,
  arg: ArgumentNode,
  graphqlType: GraphQLType,
  currentValue: VariableValue,
) {
  // if the current value is empty we don't need to traverse deeper
  // if it shouldn't be empty, the "original" validation phase should complain.
  if (currentValue == null) {
    return;
  }

  const unwrappedType = getNonNullType(graphqlType);

  if (isListType(unwrappedType)) {
    if (!Array.isArray(currentValue)) {
      // because of graphql type coercion a single object should be treated as an array of one object
      currentValue = [currentValue];
    }
    for (const value of currentValue) {
      traverseVariables(validationContext, arg, unwrappedType.ofType, value);
    }
    return;
  }

  if (typeof currentValue !== 'object') {
    // in case the value is not an object, the "original" validation phase should complain.
    return;
  }

  const inputType = getNamedType(graphqlType);
  const isOneOfInputType =
    inputType.extensions?.['oneOf'] ||
    (inputType.astNode && getDirectiveFromAstNode(inputType.astNode, 'oneOf'));

  if (isOneOfInputType && Object.keys(currentValue).length !== 1) {
    validationContext.reportError(
      createGraphQLError(`OneOf Input Object "${inputType.name}" must specify exactly one key.`, {
        nodes: [arg],
      }),
    );
  }

  if (inputType instanceof GraphQLInputObjectType) {
    for (const [name, fieldConfig] of Object.entries(inputType.getFields())) {
      traverseVariables(
        validationContext,
        arg,
        fieldConfig.type,
        (currentValue as Record<string, VariableValue>)[name],
      );
    }
  }
}
