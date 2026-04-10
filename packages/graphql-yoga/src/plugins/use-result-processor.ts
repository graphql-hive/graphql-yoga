import { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';
import { isAsyncIterable } from '@envelop/core';
import { getMediaTypesForRequestInOrder, isMatchingMediaType } from './result-processor/accept.js';
import { processMultipartResult } from './result-processor/multipart.js';
import { processRegularResult } from './result-processor/regular.js';
import { getSSEProcessor } from './result-processor/sse.js';
import { Plugin, ResultProcessor } from './types.js';

export interface ExecutionArgsForResult {
  schema: GraphQLSchema;
  document: DocumentNode;
  operationName?: string;
  variableValues?: Record<string, unknown> | undefined;
}

/**
 * WeakMap associating each execution result with the corresponding execution arguments.
 * Used by the optimized serializer to traverse the selection set instead of using JSON.stringify.
 */
export const executionArgsByResult = new WeakMap<ExecutionResult, ExecutionArgsForResult>();

interface ResultProcessorConfig {
  processResult: ResultProcessor;
  asyncIterables: boolean;
  mediaTypes: string[];
}

const multipart: ResultProcessorConfig = {
  mediaTypes: ['multipart/mixed'],
  asyncIterables: true,
  processResult: processMultipartResult,
};

function getSSEProcessorConfig(): ResultProcessorConfig {
  return {
    mediaTypes: ['text/event-stream'],
    asyncIterables: true,
    processResult: getSSEProcessor(),
  };
}

const regular: ResultProcessorConfig = {
  mediaTypes: ['application/graphql-response+json', 'application/json'],
  asyncIterables: false,
  processResult: processRegularResult,
};

function storeExecutionArgs(
  result: ExecutionResult | AsyncIterable<ExecutionResult>,
  args: ExecutionArgsForResult,
): void {
  if (isAsyncIterable(result)) {
    // For async iterables each yielded item is a separate result; handled in onNext
    return;
  }
  executionArgsByResult.set(result, args);
}

export function useResultProcessors(): Plugin {
  const isSubscriptionRequestMap = new WeakMap<Request, boolean>();

  const sse = getSSEProcessorConfig();
  const defaultList = [sse, multipart, regular];
  const subscriptionList = [sse, regular];

  return {
    onExecute({ args }) {
      const executionArgs: ExecutionArgsForResult = {
        schema: args.schema,
        document: args.document,
        operationName: args.operationName ?? undefined,
        variableValues: args.variableValues as Record<string, unknown> | undefined,
      };
      return {
        onExecuteDone({ result }) {
          storeExecutionArgs(result, executionArgs);
        },
      };
    },
    onSubscribe({ args: { contextValue, schema, document, operationName, variableValues } }) {
      if (contextValue.request) {
        isSubscriptionRequestMap.set(contextValue.request, true);
      }
      const executionArgs: ExecutionArgsForResult = {
        schema,
        document,
        operationName: operationName ?? undefined,
        variableValues: variableValues as Record<string, unknown> | undefined,
      };
      return {
        onSubscribeResult({ result }) {
          storeExecutionArgs(result, executionArgs);
        },
      };
    },
    onResultProcess({ request, result, acceptableMediaTypes, setResultProcessor }) {
      const isSubscriptionRequest = isSubscriptionRequestMap.get(request);
      const processorConfigList = isSubscriptionRequest ? subscriptionList : defaultList;
      const requestMediaTypes = getMediaTypesForRequestInOrder(request);
      const isAsyncIterableResult = isAsyncIterable(result);

      for (const resultProcessorConfig of processorConfigList) {
        for (const requestMediaType of requestMediaTypes) {
          if (isAsyncIterableResult && !resultProcessorConfig.asyncIterables) {
            continue;
          }
          for (const processorMediaType of resultProcessorConfig.mediaTypes) {
            acceptableMediaTypes.push(processorMediaType);
            if (isMatchingMediaType(processorMediaType, requestMediaType)) {
              setResultProcessor(resultProcessorConfig.processResult, processorMediaType);
            }
          }
        }
      }
    },
  };
}
