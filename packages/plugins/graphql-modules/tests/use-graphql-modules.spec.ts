import { parse } from 'graphql';
import {
  createApplication,
  createModule,
  ExecutionContext,
  Injectable,
  Scope,
} from 'graphql-modules';
import 'reflect-metadata';
import { useExtendContext } from '@envelop/core';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { useGraphQLModules } from '../src/index.js';

function createApp(onDestroy: () => void) {
  @Injectable({
    scope: Scope.Operation,
  })
  class TestProvider {
    constructor() {}

    getFoo() {
      return 'testFoo';
    }

    getBar() {
      return 'testBar';
    }

    onDestroy() {
      onDestroy();
    }
  }

  return createApplication({
    modules: [
      createModule({
        id: 'test',
        typeDefs: parse(/* GraphQL */ `
          type Query {
            foo: String
          }

          type Subscription {
            bar: String
          }
        `),
        providers: [TestProvider],
        resolvers: {
          Query: {
            foo: (_root: never, _args: never, { injector }: GraphQLModules.Context) =>
              injector.get(TestProvider).getFoo(),
          },
          Subscription: {
            bar: {
              subscribe: async function* (
                _root: never,
                _args: never,
                { injector }: GraphQLModules.Context,
              ) {
                yield injector.get(TestProvider).getBar();
              },
              resolve: (id: unknown) => id,
            },
          },
        },
      }),
    ],
  });
}

describe('useGraphQLModules', () => {
  test('query operation', async () => {
    let isDestroyed = false;
    const app = createApp(() => {
      isDestroyed = true;
    });
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('testFoo');
    expect(isDestroyed).toEqual(true);
  });

  test('subscription operation', async () => {
    let isDestroyed = false;

    const app = createApp(() => {
      isDestroyed = true;
    });
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const resultStream = await testInstance.execute(`subscription { bar }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    expect(allResults[0]?.data?.bar).toEqual('testBar');
    expect(isDestroyed).toEqual(true);
  });

  // TODO: check how well it works with graphql-modules when integrating other envelop plugins

  test("merging singleton provider context with envelop's context", async () => {
    @Injectable({ scope: Scope.Singleton })
    class IdentifierProvider {
      @ExecutionContext()
      private context: any;
      getId() {
        return this.context.identifier;
      }
    }

    const mod = createModule({
      id: 'mod',
      providers: [IdentifierProvider],
      typeDefs: parse(/* GraphQL */ `
        type Query {
          getAsyncIdentifier: String!
        }
      `),
      resolvers: {
        Query: {
          async getAsyncIdentifier(_0: unknown, _1: unknown, context: GraphQLModules.Context) {
            const identifier = context.injector.get(IdentifierProvider).getId();
            // @ts-expect-error just to make sure envelop's contexts are properly merged
            return context.identifierPrefix + identifier + context.identifierSuffix;
          },
        },
      },
    });

    const app = createApplication({ modules: [mod] });

    const testInstance = createTestkit([
      useExtendContext(() => ({ identifierSuffix: '-bye' })),
      useGraphQLModules(app),
      useExtendContext(() => ({ identifierPrefix: 'henlo-' })),
    ]);

    const query = /* GraphQL */ `
      {
        getAsyncIdentifier
      }
    `;

    await expect(testInstance.execute(query, {}, { identifier: 'bob' })).resolves.toEqual({
      data: {
        getAsyncIdentifier: 'henlo-bob-bye',
      },
    });
  });

  test('accessing a singleton provider context during another asynchronous execution', async () => {
    @Injectable({ scope: Scope.Singleton })
    class IdentifierProvider {
      @ExecutionContext()
      private context: any;
      getId() {
        return this.context.identifier;
      }
    }

    const { promise: gettingBefore, resolve: gotBefore } = createDeferred();

    const { promise: waitForGettingAfter, resolve: getAfter } = createDeferred();

    const mod = createModule({
      id: 'mod',
      providers: [IdentifierProvider],
      typeDefs: parse(/* GraphQL */ `
        type Query {
          getAsyncIdentifiers: Identifiers!
        }

        type Identifiers {
          before: String!
          after: String!
        }
      `),
      resolvers: {
        Query: {
          async getAsyncIdentifiers(_0: unknown, _1: unknown, context: GraphQLModules.Context) {
            const before = context.injector.get(IdentifierProvider).getId();
            gotBefore();
            await waitForGettingAfter;
            const after = context.injector.get(IdentifierProvider).getId();
            return { before, after };
          },
        },
      },
    });

    const app = createApplication({ modules: [mod] });

    const testInstance = createTestkit([useGraphQLModules(app)]);

    const query = /* GraphQL */ `
      {
        getAsyncIdentifiers {
          before
          after
        }
      }
    `;

    const firstResult$ = testInstance.execute(query, {}, { identifier: 'first' });

    await gettingBefore;

    const secondResult$ = testInstance.execute(query, {}, { identifier: 'second' });

    getAfter();

    await expect(firstResult$).resolves.toEqual({
      data: {
        getAsyncIdentifiers: {
          before: 'first',
          after: 'first',
        },
      },
    });

    await expect(secondResult$).resolves.toEqual({
      data: {
        getAsyncIdentifiers: {
          before: 'second',
          after: 'second',
        },
      },
    });
  });
});

function createDeferred<T = void>() {
  let resolve!: (val: T) => void, reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject,
  };
}
