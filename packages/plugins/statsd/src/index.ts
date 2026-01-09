import type { StatsD } from 'hot-shots';
import {
  AfterParseEventPayload,
  isAsyncIterable,
  isIntrospectionOperationString,
  Plugin,
} from '@envelop/core';

export interface StatsDPluginOptions {
  client: StatsD;
  /**
   * If you wish to disable introspection logging (default: false)
   */
  skipIntrospection?: boolean;
  /**
   * <prefix>.operations.count (default: graphql)
   */
  prefix?: string;
}

export const metricNames = {
  operationCount: 'operations.count',
  errorCount: 'operations.error_count',
  latency: 'operations.latency',
};
const statsDPluginTagsSymbol = Symbol('statsDPluginTagsSymbol');
const statsDPluginExecutionStartTimeSymbol = Symbol('statsDPluginExecutionStartTimeSymbol');

interface Tags {
  [key: string]: string;
}

interface PluginInternalContext {
  [statsDPluginTagsSymbol]: Tags;
  [statsDPluginExecutionStartTimeSymbol]: number;
}

function getOperation(document: any) {
  return document.definitions.find((def: any) => def.kind === 'OperationDefinition');
}

function isParseFailure(
  parseResult: AfterParseEventPayload<any>['result'],
): parseResult is Error | null {
  return parseResult === null || parseResult instanceof Error;
}

function getTags(context: PluginInternalContext) {
  return context[statsDPluginTagsSymbol];
}

export const useStatsD = (options: StatsDPluginOptions): Plugin<PluginInternalContext> => {
  const { client, prefix = 'graphql', skipIntrospection = false } = options;

  function createMetricName(name: string) {
    return `${prefix}.${name}`;
  }

  function increaseErrorCount(tags?: Tags) {
    client.increment(createMetricName(metricNames.errorCount), tags);
  }

  function increaseOperationCount(tags?: Tags) {
    client.increment(createMetricName(metricNames.operationCount), tags);
  }

  return {
    onEnveloped({ extendContext }) {
      extendContext({
        [statsDPluginExecutionStartTimeSymbol]: Date.now(),
      });
    },
    onParse({ extendContext, params }) {
      if (skipIntrospection && isIntrospectionOperationString(params.source)) {
        return;
      }

      return function onParseDone(payload) {
        if (isParseFailure(payload.result)) {
          increaseErrorCount();
          increaseOperationCount();
        } else {
          const operation = getOperation(payload.result);

          extendContext({
            [statsDPluginTagsSymbol]: {
              operation: operation?.name?.value || 'anonymous',
            },
          });
        }
      };
    },
    onValidate({ context }) {
      const tags = getTags(context);

      if (!tags) {
        return undefined;
      }

      return function onValidateDone({ valid }) {
        if (!valid) {
          increaseErrorCount(tags);
          increaseOperationCount(tags);
        }
      };
    },
    onExecute({ args }) {
      const tags = getTags(args.contextValue);

      if (!tags) {
        return undefined;
      }

      return {
        onExecuteDone({ result }) {
          const latency = Date.now() - args.contextValue[statsDPluginExecutionStartTimeSymbol];

          if (isAsyncIterable(result)) {
            console.warn(
              `Plugin "statsd" encountered a AsyncIterator which is not supported yet, so tracing data is not available for the operation.`,
            );
            return;
          }

          increaseOperationCount(tags);

          if (result.errors && Array.isArray(result.errors)) {
            increaseErrorCount(tags);
          } else {
            client.histogram(createMetricName(metricNames.latency), latency, tags);
          }
        },
      };
    },
  };
};
