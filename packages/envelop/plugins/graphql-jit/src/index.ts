/* eslint-disable no-console */
import type { DocumentNode, ExecutionArgs, ExecutionResult } from 'graphql';
import type { CompiledQuery, CompilerOptions } from 'graphql-jit';
import { compileQuery, isCompiledQuery } from 'graphql-jit';
import type { Plugin } from '@envelop/core';
import { getDocumentString, makeExecute, makeSubscribe } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

type JSONStringifier = (result: any) => string;

type JITCacheEntry = {
  query: CompiledQuery['query'];
  subscribe?: CompiledQuery['subscribe'];
  stringify: JSONStringifier;
};

export type ExecutionResultWithSerializer = ExecutionResult & {
  stringify?: JSONStringifier;
};

export interface JITCache {
  get(key: string): JITCacheEntry | undefined;
  set(key: string, value: JITCacheEntry): void;
}

export const useGraphQlJit = (
  compilerOptions: Partial<CompilerOptions> = {},
  pluginOptions: {
    /**
     * A helper function that helps to conditionally enable JIT based on incoming request
     */
    enableIf?: (executionArgs: ExecutionArgs) => boolean | Promise<boolean>;
    /**
     * Callback triggered in case of GraphQL Jit compilation error.
     */
    onError?: (r: ExecutionResultWithSerializer) => void;
    /**
     * Custom cache instance
     */
    cache?: JITCache;
  } = {},
): Plugin => {
  const jitCacheByDocumentString = pluginOptions.cache;

  const jitCacheByDocument = new WeakMap<DocumentNode, JITCacheEntry>();

  function getCacheEntry(args: ExecutionArgs): JITCacheEntry {
    let cacheEntry: JITCacheEntry | undefined;

    cacheEntry = jitCacheByDocument.get(args.document);

    if (!cacheEntry && jitCacheByDocumentString) {
      const documentSource = getDocumentString(args.document);
      if (documentSource) {
        cacheEntry = jitCacheByDocumentString.get(documentSource);
      }
    }

    if (!cacheEntry) {
      const compilationResult = compileQuery(
        args.schema,
        args.document,
        args.operationName ?? undefined,
        compilerOptions,
      );

      if (isCompiledQuery(compilationResult)) {
        cacheEntry = compilationResult;
      } else {
        if (pluginOptions?.onError) {
          pluginOptions.onError(compilationResult);
        } else {
          console.error(compilationResult);
        }
        cacheEntry = {
          query: () => compilationResult,
          stringify: r => JSON.stringify(r),
        };
      }

      jitCacheByDocument.set(args.document, cacheEntry);
      if (jitCacheByDocumentString) {
        const documentSource = getDocumentString(args.document);
        if (documentSource) {
          jitCacheByDocumentString.set(documentSource, cacheEntry);
        }
      }
    }
    return cacheEntry;
  }

  function jitExecutor(args: ExecutionArgs) {
    const cacheEntry = getCacheEntry(args);
    const executeFn = cacheEntry.subscribe ?? cacheEntry.query;

    return handleMaybePromise(
      () =>
        executeFn(
          args.rootValue,
          args.contextValue,
          args.variableValues,
        ) as ExecutionResultWithSerializer,
      result => {
        result.stringify = cacheEntry.stringify;
        return result;
      },
    );
  }

  const executeFn = makeExecute(jitExecutor);
  const subscribeFn = makeSubscribe(jitExecutor);
  const enableIfFn = pluginOptions.enableIf;

  return {
    onExecute({ args, setExecuteFn }) {
      if (enableIfFn) {
        return handleMaybePromise(
          () => enableIfFn(args),
          enableIfRes => {
            if (enableIfRes) {
              setExecuteFn(executeFn);
            }
          },
        );
      }
      setExecuteFn(executeFn);
    },
    onSubscribe({ args, setSubscribeFn }) {
      if (enableIfFn) {
        return handleMaybePromise(
          () => enableIfFn(args),
          enableIfRes => {
            if (enableIfRes) {
              setSubscribeFn(subscribeFn);
            }
          },
        );
      }
      setSubscribeFn(subscribeFn);
    },
  };
};
