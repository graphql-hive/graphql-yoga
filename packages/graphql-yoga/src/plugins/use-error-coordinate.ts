import { ExecutionArgs } from '@graphql-tools/executor';
import { Plugin } from '@graphql-yoga/types';

export function useErrorCoordinate(): Plugin {
  return {
    onExecute({ args }) {
      (args as ExecutionArgs).schemaCoordinateInErrors = true;
    },
  };
}
