import type { ExecutionResult } from 'graphql';
import type { ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
import type { Cache } from '@envelop/response-cache';
import { buildOperationKey } from '../src/cache-key.js';
import { createKvCache } from '../src/index.js';

type Env = {
  ENVIRONMENT: 'testing' | 'development' | 'production';
  GRAPHQL_RESPONSE_CACHE: KVNamespace;
};

describe('@envelop/response-cache-cloudflare-kv integration tests', () => {
  let maxTtl: number;
  let cache: Cache;
  const dataValue: ExecutionResult<{ key: string }, { extensions: string }> = {
    errors: [],
    data: { key: 'value' },
    extensions: { extensions: 'value' },
  };
  const dataKey = '1B9502F92EFA53AFF0AC650794AA79891E4B6900';
  let KV: KVNamespace;
  let executionContext: ExecutionContext;
  const keyPrefix = 'vitest';
  const KVName = 'GRAPHQL_RESPONSE_CACHE';

  beforeEach(() => {
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    const env = getMiniflareBindings<Env>();
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    executionContext = new ExecutionContext();
    KV = env[KVName];
    maxTtl = 60 * 1000; // 1 minute
    cache = createKvCache({
      KVName,
      keyPrefix,
    })({
      GRAPHQL_RESPONSE_CACHE: KV,
      waitUntil: executionContext.waitUntil.bind(executionContext),
    });
  });

  test('should work with a basic set() and get()', async () => {
    await cache.set(
      dataKey,
      dataValue,
      [{ typename: 'User' }, { typename: 'User', id: 1 }, { typename: 'User', id: 2 }],
      maxTtl,
    );
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    const result = await cache.get(dataKey);
    expect(result).toEqual(dataValue);

    const operationKey = buildOperationKey(dataKey, keyPrefix);
    const operationValue = await KV.get(operationKey, 'text');
    expect(operationValue).toBeTruthy();
    expect(JSON.parse(operationValue!)).toEqual(dataValue);
  });

  test('should return null when calling get() on a non-existent key', async () => {
    const result = await cache.get(dataKey);
    expect(result).toBeFalsy();
  });

  test('should return null when calling get() on an invalidated key', async () => {
    await cache.set(
      dataKey,
      dataValue,
      [{ typename: 'User' }, { typename: 'User', id: 1 }, { typename: 'User', id: 2 }],
      maxTtl,
    );
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    await cache.invalidate([{ typename: 'User' }]);
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    const result = await cache.get(dataKey);
    expect(result).toBeFalsy();

    const allKeys = await KV.list();
    expect(allKeys.keys.length).toEqual(0);
  });
});
