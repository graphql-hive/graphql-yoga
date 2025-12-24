import { formatApolloErrors } from 'apollo-server-errors';
import type { ExecutionResult, GraphQLError } from 'graphql';
import { handleStreamOrSingleExecutionResult, Plugin } from '@envelop/core';

const makeHandleResult =
  (options: Parameters<typeof formatApolloErrors>[1] = {}) =>
  ({
    result,
    setResult,
  }: {
    result: ExecutionResult;
    setResult: (result: ExecutionResult) => void;
  }) => {
    if (result.errors && result.errors.length > 0) {
      setResult({
        ...result,
        // Upstream issue in apollo with GraphQL.js 16
        // Type 'ApolloError[]' is not assignable to type 'readonly GraphQLError[]'. Property '[Symbol.toStringTag]' is missing in type 'ApolloError' but required in type 'GraphQLError'.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        errors: formatApolloErrors(result.errors, {
          debug: options.debug,
          formatter: options.formatter,
        }) as GraphQLError[],
      });
    }
  };

export const useApolloServerErrors = (
  options: Parameters<typeof formatApolloErrors>[1] = {},
): Plugin => {
  return {
    onExecute() {
      const handleResult = makeHandleResult(options);

      return {
        onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, handleResult);
        },
      };
    },
  };
};
