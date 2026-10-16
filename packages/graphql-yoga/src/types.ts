/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLSchema } from 'graphql';
import type { PromiseOrValue } from '@envelop/core';
import type { Logger } from '@graphql-hive/logger';
import type { createFetch } from '@whatwg-node/fetch';
import type { ServerAdapterInitialContext } from '@whatwg-node/server';

export type GraphQLSchemaWithContext<TContext> = GraphQLSchema & {
  _context?: TContext;
};

export interface GraphQLParams<
  TVariables = Record<string, any>,
  TExtensions = Record<string, any>,
> {
  operationName?: string;
  query?: string;
  variables?: TVariables;
  extensions?: TExtensions;
}

export interface YogaConfigContext {
  /**
   * The logger to use throughout Yoga and its plugins.
   *
   * Within a request, this is a request-scoped child logger carrying a `requestId` attribute,
   * so every log line produced while handling that request can be correlated together.
   */
  log: Logger;
}

export interface YogaInitialContext extends ServerAdapterInitialContext, YogaConfigContext {
  /**
   * GraphQL Parameters
   */
  params: GraphQLParams;
  /**
   * An object describing the HTTP request.
   */
  request: Request;
}

export type CORSOptions =
  | {
      origin?: string[] | string;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    }
  | false;

declare module 'graphql' {
  interface GraphQLHTTPErrorExtensions {
    spec?: boolean;
    status?: number;
    headers?: Record<string, string>;
  }
  interface GraphQLErrorExtensions {
    http?: GraphQLHTTPErrorExtensions;
  }
}

export type FetchAPI = ReturnType<typeof createFetch>;

export interface FetchEvent extends Event {
  request: Request;
  respondWith(response: PromiseOrValue<Response>): void;
}

export type YogaMaskedErrorOpts = {
  maskError: MaskError;
  errorMessage: string;
  isDev?: boolean;
};

export type MaskError = (
  error: unknown,
  message: string,
  isDev?: boolean,
  /**
   * The context of the request that caused the error, so a masked error (and any logging
   * around it) can be correlated with - and informed by - the request, e.g. its `log`ger,
   * headers or authenticated user. Passed by whichever caller has it: `handleError` (error.ts)
   * for the HTTP path, or envelop's `useMaskedErrors` itself for subscription/streaming errors
   * (it gets one from the context it's given at the point of the call). May be partial, or
   * unset entirely, for an error before a full context could be built.
   */
  context?: Partial<YogaInitialContext>,
) => Error;

export type MaybeArray<T> = T | T[];

export interface GraphQLHTTPExtensions {
  spec?: boolean;
  status?: number;
  headers?: Record<string, string>;
}
