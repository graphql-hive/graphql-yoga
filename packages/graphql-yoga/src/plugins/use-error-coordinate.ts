import { ExecutionArgs } from '@graphql-tools/executor';
import { Plugin } from './types.js';

export function useErrorCoordinate(): Plugin {
  return {
    onExecute({ args }) {
      (args as ExecutionArgs).schemaCoordinateInErrors = true;
    },
  };
}
