import type { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { executorExchange } from '@graphql-tools/executor-urql-exchange';
import type { Exchange } from '@urql/core';

export type YogaExchangeOptions = HTTPExecutorOptions;

export function yogaExchange(options?: HTTPExecutorOptions): Exchange {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return executorExchange(buildHTTPExecutor(options) as any);
}
