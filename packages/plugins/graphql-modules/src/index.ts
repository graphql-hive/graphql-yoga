import type { Application } from 'graphql-modules';
import type { Plugin } from '@envelop/core';

export const useGraphQLModules = (app: Application): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(app.schema);
    },
    onExecute({ setExecuteFn, executeFn }) {
      setExecuteFn(
        app.createExecution({
          execute: executeFn,
        }),
      );
    },
    onSubscribe({ setSubscribeFn, subscribeFn }) {
      setSubscribeFn(
        app.createSubscription({
          subscribe: subscribeFn,
        }),
      );
    },
  };
};
