import { assertStreamExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyLiveQueryJSONDiffPatchGenerator } from '@n1ru4l/graphql-live-query-patch-jsondiffpatch';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { GraphQLLiveDirectiveSDL, useLiveQuery } from '../src/index.js';

const schema = makeExecutableSchema({
  typeDefs: [
    /* GraphQL */ `
      type Query {
        greetings: [String!]
      }
    `,
    GraphQLLiveDirectiveSDL,
  ],
  resolvers: {
    Query: {
      greetings: (_: unknown, __: unknown, context) => context.greetings,
    },
  },
});

describe('useLiveQuery', () => {
  it('works with simple schema', async () => {
    const liveQueryStore = new InMemoryLiveQueryStore();
    const testKit = createTestkit([useLiveQuery({ liveQueryStore })], schema);
    const contextValue = {
      greetings: ['Hi', 'Sup', 'Ola'],
    };
    const result = await testKit.execute(
      /* GraphQL */ `
        query @live {
          greetings
        }
      `,
      undefined,
      contextValue,
    );
    assertStreamExecutionValue(result);
    let current = await result.next();
    expect(current.value).toMatchInlineSnapshot(`
      {
        "data": {
          "greetings": [
            "Hi",
            "Sup",
            "Ola",
          ],
        },
        "isLive": true,
      }
    `);
    contextValue.greetings.reverse();
    liveQueryStore.invalidate('Query.greetings');
    current = await result.next();
    expect(current.value).toMatchInlineSnapshot(`
      {
        "data": {
          "greetings": [
            "Ola",
            "Sup",
            "Hi",
          ],
        },
        "isLive": true,
      }
    `);
    result.return?.();
  });

  it('apply patch middleware', async () => {
    const liveQueryStore = new InMemoryLiveQueryStore();
    const testKit = createTestkit(
      [
        useLiveQuery({
          liveQueryStore,
          applyLiveQueryPatchGenerator: applyLiveQueryJSONDiffPatchGenerator,
        }),
      ],
      schema,
    );
    const contextValue = {
      greetings: ['Hi', 'Sup', 'Ola'],
    };
    const result = await testKit.execute(
      /* GraphQL */ `
        query @live {
          greetings
        }
      `,
      undefined,
      contextValue,
    );
    assertStreamExecutionValue(result);
    let current = await result.next();
    contextValue.greetings.reverse();
    liveQueryStore.invalidate('Query.greetings');
    current = await result.next();
    expect(current.value).toMatchInlineSnapshot(`
      {
        "patch": {
          "greetings": {
            "_1": [
              null,
              1,
              3,
            ],
            "_2": [
              null,
              0,
              3,
            ],
            "_t": "a",
          },
        },
        "revision": 2,
      }
    `);
    result.return?.();
  });
});
