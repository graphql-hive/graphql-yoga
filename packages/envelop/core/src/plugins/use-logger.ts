/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import { envelopIsIntrospectionSymbol, isIntrospectionOperationString } from '../utils.js';

type LoggerPluginOptions = {
  logFn: typeof console.log;
  skipIntrospection?: boolean;
};

const DEFAULT_OPTIONS: LoggerPluginOptions = {
  logFn: console.log,
};

export const useLogger = <TContext extends Record<string, any>>(
  rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS,
): Plugin<TContext> => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  const introspectionCtx = new WeakSet();

  return {
    onParse({ context, params }) {
      if (options.skipIntrospection && isIntrospectionOperationString(params.source)) {
        introspectionCtx.add(context);
      }
    },
    onExecute({ args }) {
      if (introspectionCtx.has(args.contextValue)) {
        return;
      }

      options.logFn('execute-start', { args });

      return {
        onExecuteDone: ({ result }) => {
          options.logFn('execute-end', { args, result });
        },
      };
    },
    onSubscribe({ args }) {
      if (introspectionCtx.has(args.contextValue)) {
        return;
      }

      options.logFn('subscribe-start', { args });

      return {
        onSubscribeResult: ({ result }) => {
          options.logFn('subscribe-end', { args, result });
        },
      };
    },
  };
};
