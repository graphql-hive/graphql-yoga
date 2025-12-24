import type { Application } from 'graphql-modules';
import type { Plugin, TypedExecutionArgs } from '@envelop/core';

const graphqlModulesControllerSymbol = Symbol('GRAPHQL_MODULES');

function destroy(context: TypedExecutionArgs<any>) {
  if (context.contextValue?.[graphqlModulesControllerSymbol]) {
    context.contextValue[graphqlModulesControllerSymbol].destroy();
    context.contextValue[graphqlModulesControllerSymbol] = null;
  }
}

export const useGraphQLModules = (app: Application): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(app.schema);
    },
    onContextBuilding({ extendContext, context }) {
      const controller = app.createOperationController({
        context,
        autoDestroy: false,
      });

      extendContext({
        ...controller.context,
        [graphqlModulesControllerSymbol]: controller,
      });
    },
    onExecute({ args }) {
      return {
        onExecuteDone() {
          destroy(args);
        },
      };
    },
    onSubscribe({ args }) {
      return {
        onSubscribeResult({ args }) {
          return {
            onEnd() {
              destroy(args);
            },
          };
        },
        onSubscribeError() {
          destroy(args);
        },
      };
    },
  };
};
