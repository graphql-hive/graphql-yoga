import { isAsyncIterable } from '@envelop/core';
import { getMediaTypesForRequestInOrder, isMatchingMediaType } from './result-processor/accept.js';
import { processMultipartResult } from './result-processor/multipart.js';
import { processRegularResult } from './result-processor/regular.js';
import { getSSEProcessor } from './result-processor/sse.js';
import { Plugin, ResultProcessor } from './types.js';
import { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';

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

export interface ExecutionArgsForResult {
  schema: GraphQLSchema;
  document: DocumentNode;
  operationName?: string;
  variableValues?: Record<string, any> | undefined;
}

export const executionArgsByResult = new WeakMap<ExecutionResult, ExecutionArgsForResult>();

export function useResultProcessors(): Plugin {
  const isSubscriptionRequestMap = new WeakMap<Request, boolean>();

  const sse = getSSEProcessorConfig();
  const defaultList = [sse, multipart, regular];
  const subscriptionList = [sse, regular];


  interface HookPayload {
    args: ExecutionArgsForResult;
    result: any;
  }

  interface AsyncIterableResult {
    onNext: (payload: HookPayload) => void;
  }

  function handleExecutionResult(
    payload: HookPayload
  ): AsyncIterableResult | void {
    if (isAsyncIterable(payload.result)) {
      return {
        onNext(payload) {
          executionArgsByResult.set(payload.result, {
            schema: payload.args.schema,
            document: payload.args.document,
            variableValues: payload.args.variableValues,
            operationName: payload.args.operationName,
          });
        }
      }
    }
    executionArgsByResult.set(payload.result, {
      schema: payload.args.schema,
      document: payload.args.document,
      variableValues: payload.args.variableValues,
      operationName: payload.args.operationName,
    });
  }

  return {
    onExecute() {
      return {
        onExecuteDone(payload) {
          return handleExecutionResult(payload);
        }
      }
    },
    onSubscribe({ args: { contextValue } }) {
      if (contextValue.request) {
        isSubscriptionRequestMap.set(contextValue.request, true);
      }
      return {
        onSubscribeResult(payload) {
          return handleExecutionResult(payload);
        }
      }
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
