// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
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
          execute: executeFn as any,
        }),
      );
    },
    onSubscribe({ setSubscribeFn, subscribeFn }) {
      setSubscribeFn(
        app.createSubscription({
          subscribe: subscribeFn as any,
        }),
      );
    },
  };
};
