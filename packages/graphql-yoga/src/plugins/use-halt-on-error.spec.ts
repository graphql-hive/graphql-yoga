import { isAsyncIterable } from '@envelop/core';
import { createSchema } from '../schema.js';
import { createYoga } from '../server.js';
import type { ExecutionResultWithSerializer } from './types.js';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      ok: String
      bad: String
    }
  `,
  resolvers: {
    Query: {
      ok: () => 'yes',
      bad: () => {
        throw new Error('bad failed');
      },
    },
  },
});

function post(body: Record<string, unknown>) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Regression test: when a plugin short-circuits via `setResult` in `onParams`
// (as a response-cache hit does, skipping `handleParams` and so `context.params`),
// `useHaltOnError` must still apply *this* request's own `onError`, not throw
// and not reuse one left over from whichever request produced the replayed result.
test('useHaltOnError applies the current request onError on a cache-hit-shaped result', async () => {
  let cachedResult: ExecutionResultWithSerializer | undefined;

  const yoga = createYoga({
    schema,
    maskedErrors: false,
    plugins: [
      {
        onExecutionResult({ result }) {
          if (!isAsyncIterable(result) && result) {
            cachedResult = result;
          }
        },
        onParams({ params, setResult }) {
          if (params.extensions?.['simulateCacheHit'] && cachedResult) {
            setResult(cachedResult);
          }
        },
      },
    ],
  });

  const populate = await yoga.fetch('http://yoga/graphql', post({ query: '{ ok bad }' }));
  expect(populate.status).toBe(200);
  const populateBody = await populate.json();
  expect(populateBody).toEqual({
    data: { ok: 'yes', bad: null },
    errors: [expect.objectContaining({ message: 'bad failed' })],
  });
  expect(cachedResult).toBeDefined();

  const hit = await yoga.fetch(
    'http://yoga/graphql',
    post({
      query: '{ ok bad }',
      onError: 'HALT',
      extensions: { simulateCacheHit: true },
    }),
  );

  expect(hit.status).toBe(200);
  const hitBody = await hit.json();
  expect(hitBody).toEqual({
    data: null,
    errors: [expect.objectContaining({ message: 'bad failed' })],
  });
});
