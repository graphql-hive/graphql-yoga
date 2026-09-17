/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLSchema } from 'graphql';
import type { PromiseOrValue } from '@envelop/core';
import { Logger } from '@graphql-hive/logger';
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

export interface YogaInitialContext extends ServerAdapterInitialContext {
  /**
   * GraphQL Parameters
   */
  params: GraphQLParams;
  /**
   * An object describing the HTTP request.
   */
  request: Request;
  /**
   * A request-scoped logger.
   * Carries a `requestId` attribute so every log line produced while handling this request
   * can be correlated together.
   */
  logger: Logger;
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
  /**
   * Request-scoped logger for `maskError` to use, since it has no context of its own.
   * Set by `handleError` (error.ts) just before calling `maskError`. When envelop's
   * `useMaskedErrors` calls `maskError` directly (subscription/streaming errors), this
   * isn't set, and `maskError` falls back to the server's base logger.
   */
  _requestLogger?: Logger;
};

export type MaskError = (error: unknown, message: string, isDev?: boolean) => Error;

export type MaybeArray<T> = T | T[];

export interface GraphQLHTTPExtensions {
  spec?: boolean;
  status?: number;
  headers?: Record<string, string>;
}
