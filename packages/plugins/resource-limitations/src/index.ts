import {
  ExecutionArgs,
  ExecutionResult,
  FieldNode,
  GraphQLError,
  GraphQLField,
  GraphQLInputType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLType,
  isScalarType,
} from 'graphql';
import { handleStreamOrSingleExecutionResult, Plugin } from '@envelop/core';
import { ExtendedValidationRule, useExtendedValidation } from '@envelop/extended-validation';
import { getArgumentValues } from '@graphql-tools/utils';

const getWrappedType = (
  graphqlType: GraphQLType,
): Exclude<GraphQLType, GraphQLList<any> | GraphQLNonNull<any>> => {
  if (graphqlType instanceof GraphQLList || graphqlType instanceof GraphQLNonNull) {
    return getWrappedType(graphqlType.ofType);
  }
  return graphqlType;
};

const isValidArgType = (type: GraphQLInputType, paginationArgumentTypes?: string[]): boolean =>
  type === GraphQLInt ||
  (isScalarType(type) && !!paginationArgumentTypes && paginationArgumentTypes.includes(type.name));

const hasFieldDefConnectionArgs = (field: GraphQLField<any, any>, argumentTypes?: string[]) => {
  let hasFirst = false;
  let hasLast = false;
  for (const arg of field.args) {
    if (arg.name === 'first' && isValidArgType(arg.type, argumentTypes)) {
      hasFirst = true;
    } else if (arg.name === 'last' && isValidArgType(arg.type, argumentTypes)) {
      hasLast = true;
    } else if (hasLast && hasFirst) {
      break;
    }
  }
  return { hasFirst, hasLast };
};

const buildMissingPaginationFieldErrorMessage = (params: {
  fieldName: string;
  hasFirst: boolean;
  hasLast: boolean;
}) =>
  `Missing pagination argument for field '${params.fieldName}'. ` +
  `Please provide ` +
  (params.hasFirst && params.hasLast
    ? "either the 'first' or 'last'"
    : params.hasFirst
      ? "the 'first'"
      : "the 'last'") +
  ' field argument.';

const buildInvalidPaginationRangeErrorMessage = (params: {
  fieldName: string;
  argumentName: string;
  paginationArgumentMaximum: number;
  paginationArgumentMinimum: number;
}) =>
  `Invalid pagination argument for field '${params.fieldName}'. ` +
  `The value for the '${params.argumentName}' argument must be an integer within ${params.paginationArgumentMinimum}-${params.paginationArgumentMaximum}.`;

export const defaultNodeCostLimit = 500000;

export const defaultPaginationArgumentMaximum = 100;

export const defaultPaginationArgumentMinimum = 1;

export type ResourceLimitationValidationRuleParams = {
  nodeCostLimit: number;
  paginationArgumentMaximum: number;
  paginationArgumentMinimum: number;
  paginationArgumentTypes?: string[];
  reportNodeCost?: (cost: number, executionArgs: ExecutionArgs) => void;
};

/**
 * Validate whether a user is allowed to execute a certain GraphQL operation.
 */
export const ResourceLimitationValidationRule =
  (params: ResourceLimitationValidationRuleParams): ExtendedValidationRule =>
  (context, executionArgs) => {
    const { paginationArgumentMaximum, paginationArgumentMinimum } = params;
    const nodeCostStack: Array<number> = [];
    let totalNodeCost = 0;

    const connectionFieldMap = new WeakSet<FieldNode>();

    return {
      Field: {
        enter(fieldNode) {
          const fieldDef = context.getFieldDef();

          // if it is not found the query is invalid and graphql validation will complain
          if (fieldDef != null) {
            const argumentValues = getArgumentValues(
              fieldDef,
              fieldNode,
              executionArgs.variableValues || undefined,
            );
            const type = getWrappedType(fieldDef.type);
            if (type instanceof GraphQLObjectType && type.name.endsWith('Connection')) {
              let nodeCost = 1;
              connectionFieldMap.add(fieldNode);

              const { hasFirst, hasLast } = hasFieldDefConnectionArgs(
                fieldDef,
                params.paginationArgumentTypes,
              );
              if (hasFirst === false && hasLast === false) {
                // eslint-disable-next-line no-console
                console.warn('Encountered paginated field without pagination arguments.');
              } else if (hasFirst === true || hasLast === true) {
                if (
                  ('first' in argumentValues === false && 'last' in argumentValues === false) ||
                  (argumentValues['first'] === null && argumentValues['last'] === null)
                ) {
                  context.reportError(
                    new GraphQLError(
                      buildMissingPaginationFieldErrorMessage({
                        fieldName: fieldDef.name,
                        hasFirst,
                        hasLast,
                      }),
                      fieldNode,
                    ),
                  );
                } else if ('first' in argumentValues && !argumentValues['last']) {
                  if (
                    argumentValues['first'] < paginationArgumentMinimum ||
                    argumentValues['first'] > paginationArgumentMaximum
                  ) {
                    context.reportError(
                      new GraphQLError(
                        buildInvalidPaginationRangeErrorMessage({
                          paginationArgumentMaximum,
                          paginationArgumentMinimum,
                          argumentName: 'first',
                          fieldName: fieldDef.name,
                        }),
                        fieldNode,
                      ),
                    );
                  } else {
                    // eslint-disable-next-line dot-notation
                    nodeCost = argumentValues['first'] as number;
                  }
                } else if (!argumentValues['first'] && 'last' in argumentValues) {
                  if (
                    argumentValues['last'] < paginationArgumentMinimum ||
                    argumentValues['last'] > paginationArgumentMaximum
                  ) {
                    context.reportError(
                      new GraphQLError(
                        buildInvalidPaginationRangeErrorMessage({
                          paginationArgumentMaximum,
                          paginationArgumentMinimum,
                          argumentName: 'last',
                          fieldName: fieldDef.name,
                        }),
                        fieldNode,
                      ),
                    );
                  } else {
                    // eslint-disable-next-line dot-notation
                    nodeCost = argumentValues['last'] as number;
                  }
                } else {
                  context.reportError(
                    new GraphQLError(
                      buildMissingPaginationFieldErrorMessage({
                        fieldName: fieldDef.name,
                        hasFirst,
                        hasLast,
                      }),
                      fieldNode,
                    ),
                  );
                }
              }

              nodeCostStack.push(nodeCost);
            }
          }
        },
        leave(node) {
          if (connectionFieldMap.delete(node)) {
            totalNodeCost = totalNodeCost + nodeCostStack.reduce((a, b) => a * b, 1);
            nodeCostStack.pop();
          }
        },
      },
      Document: {
        leave(documentNode) {
          if (totalNodeCost === 0) {
            totalNodeCost = 1;
          }
          if (totalNodeCost > params.nodeCostLimit) {
            context.reportError(
              new GraphQLError(
                `Cannot request more than ${params.nodeCostLimit} nodes in a single document. Please split your operation into multiple sub operations or reduce the amount of requested nodes.`,
                documentNode,
              ),
            );
          }
          params.reportNodeCost?.(totalNodeCost, executionArgs);
        },
      },
    };
  };

type UseResourceLimitationsParams = {
  /**
   * The node cost limit for rejecting a operation.
   * @default 500000
   */
  nodeCostLimit?: number;
  /**
   * The custom scalar types accepted for connection arguments.
   */
  paginationArgumentScalars?: string[];
  /**
   * The maximum value accepted for connection arguments.
   * @default 100
   */
  paginationArgumentMaximum?: number;
  /**
   * The minimum value accepted for connection arguments.
   * @default 1
   */
  paginationArgumentMinimum?: number;
  /**
   * Whether the resourceLimitations.nodeCost field should be included within the execution result extensions map.
   * @default false
   */
  extensions?: boolean;
};

export const useResourceLimitations = (params?: UseResourceLimitationsParams): Plugin => {
  const paginationArgumentMaximum =
    params?.paginationArgumentMaximum ?? defaultPaginationArgumentMaximum;
  const paginationArgumentMinimum =
    params?.paginationArgumentMinimum ?? defaultPaginationArgumentMinimum;
  const nodeCostLimit = params?.nodeCostLimit ?? defaultNodeCostLimit;
  const extensions = params?.extensions ?? false;
  const nodeCostMap = new WeakMap<object, number>();

  const handleResult = ({ result, args }: { result: ExecutionResult; args: ExecutionArgs }) => {
    const nodeCost = nodeCostMap.get(args);
    if (nodeCost != null) {
      result.extensions = {
        ...result.extensions,
        resourceLimitations: {
          nodeCost,
        },
      };
    }
  };

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            ResourceLimitationValidationRule({
              nodeCostLimit,
              paginationArgumentMaximum,
              paginationArgumentMinimum,
              paginationArgumentTypes: params?.paginationArgumentScalars,
              reportNodeCost: extensions
                ? (nodeCost, ref) => {
                    nodeCostMap.set(ref, nodeCost);
                  }
                : undefined,
            }),
          ],
          onValidationFailed: params => handleResult(params),
        }),
      );
    },
    onExecute({ args }) {
      return {
        onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, ({ result }) =>
            handleResult({ result, args }),
          );
        },
      };
    },
  };
};
