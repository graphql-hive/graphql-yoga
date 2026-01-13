import { isAsyncIterable } from '@envelop/core';
import { Plugin, ResultProcessor } from '@graphql-yoga/types';
import { getMediaTypesForRequestInOrder, isMatchingMediaType } from './result-processor/accept.js';
import { processMultipartResult } from './result-processor/multipart.js';
import { processRegularResult } from './result-processor/regular.js';
import { getSSEProcessor } from './result-processor/sse.js';

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

export function useResultProcessors(): Plugin {
  const isSubscriptionRequestMap = new WeakMap<Request, boolean>();

  const sse = getSSEProcessorConfig();
  const defaultList = [sse, multipart, regular];
  const subscriptionList = [sse, regular];

  return {
    onSubscribe({ args: { contextValue } }) {
      if (contextValue.request) {
        isSubscriptionRequestMap.set(contextValue.request, true);
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
