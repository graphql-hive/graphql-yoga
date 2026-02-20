import { GraphQLError, OperationTypeNode, ValidationRule } from 'graphql';

export type AllowedOperations = Iterable<OperationTypeNode>;

export const createFilterOperationTypeRule =
  (allowedOperations: AllowedOperations): ValidationRule =>
  context => {
    const ops = new Set(allowedOperations);
    return {
      OperationDefinition(node) {
        if (!ops.has(node.operation)) {
          context.reportError(
            new GraphQLError(`GraphQL operation type "${node.operation}" is not allowed.`, [node]),
          );
        }
      },
    };
  };
