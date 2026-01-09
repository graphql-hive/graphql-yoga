import { Plugin } from '@envelop/types';
import { envelopIsIntrospectionSymbol, isIntrospectionOperationString } from '../utils.js';

type LoggerPluginOptions = {
  logFn: typeof console.log;
  skipIntrospection?: boolean;
};

const DEFAULT_OPTIONS: LoggerPluginOptions = {
  logFn: console.log,
};

type InternalPluginContext = {
  [envelopIsIntrospectionSymbol]?: true;
};

export const useLogger = (
  rawOptions: LoggerPluginOptions = DEFAULT_OPTIONS,
): Plugin<InternalPluginContext> => {
  const options = {
    DEFAULT_OPTIONS,
    ...rawOptions,
  };

  return {
    onParse({ extendContext, params }) {
      if (options.skipIntrospection && isIntrospectionOperationString(params.source)) {
        extendContext({
          [envelopIsIntrospectionSymbol]: true,
        });
      }
    },
    onExecute({ args }) {
      if (args.contextValue[envelopIsIntrospectionSymbol]) {
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
      if (args.contextValue[envelopIsIntrospectionSymbol]) {
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
