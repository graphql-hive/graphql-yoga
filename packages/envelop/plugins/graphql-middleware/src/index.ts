import { applyMiddleware, IMiddleware, IMiddlewareGenerator } from 'graphql-middleware';
import type { Plugin } from '@envelop/core';

export const useGraphQLMiddleware = <TSource = any, TContext = any, TArgs = any>(
  middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | IMiddlewareGenerator<TSource, TContext, TArgs>
  )[],
): Plugin => {
  const graphqlMiddlewareAppliedTransformSymbol = 'graphqlMiddleware.appliedTransform';
  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (schema.extensions?.[graphqlMiddlewareAppliedTransformSymbol]) {
        return;
      }

      if (middlewares.length > 0) {
        const wrappedSchema = applyMiddleware(schema, ...middlewares);
        wrappedSchema.extensions = {
          ...schema.extensions,
          [graphqlMiddlewareAppliedTransformSymbol]: true,
        };
        replaceSchema(wrappedSchema);
      }
    },
  };
};
