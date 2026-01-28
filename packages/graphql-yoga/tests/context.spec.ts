import { Plugin } from '../src/plugins/types';
import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';
import { YogaInitialContext } from '../src/types';

describe('Context', () => {
  interface UserContext {
    hi: 'there';
  }

  const userContext: UserContext = { hi: 'there' };

  const schema = createSchema<YogaInitialContext & UserContext>({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        greetings: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'world',
      },
      Subscription: {
        greetings: {
          async *subscribe() {
            yield { greetings: 'Hi' };
          },
        },
      },
    },
  });

  it('should provide intial and user context to onExecute', async () => {
    const onExecuteFn = jest.fn((() => {}) as Plugin<{}, {}, UserContext>['onExecute']);

    const yoga = createYoga({
      schema,
      context: userContext,
      plugins: [
        {
          onExecute: onExecuteFn,
        },
      ],
    });

    const response = await yoga.fetch('http://yoga/graphql?query={hello}');
    expect(response.status).toBe(200);

    expect(onExecuteFn.mock.lastCall?.[0].args.contextValue.hi).toBe(userContext.hi);
    expect(onExecuteFn.mock.lastCall?.[0].args.contextValue.params).toMatchInlineSnapshot(`
      {
        "extensions": undefined,
        "operationName": undefined,
        "query": "{hello}",
        "variables": undefined,
      }
    `);
    expect(onExecuteFn.mock.lastCall?.[0].args.contextValue.request).toBeDefined();
  });

  it('should provide intial and user context to onSubscribe', async () => {
    const onSubscribeFn = jest.fn((() => {}) as Plugin<{}, {}, UserContext>['onSubscribe']);

    const yoga = createYoga({
      schema,
      context: userContext,
      plugins: [
        {
          onSubscribe: onSubscribeFn,
        },
      ],
    });

    const response = await yoga.fetch('http://yoga/graphql?query=subscription{greetings}', {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    expect(response.status).toBe(200);

    expect(onSubscribeFn.mock.lastCall?.[0].args.contextValue.hi).toBe(userContext.hi);
    expect(onSubscribeFn.mock.lastCall?.[0].args.contextValue.params).toMatchInlineSnapshot(`
      {
        "extensions": undefined,
        "operationName": undefined,
        "query": "subscription{greetings}",
        "variables": undefined,
      }
    `);
    expect(onSubscribeFn.mock.lastCall?.[0].args.contextValue.request).toBeDefined();
  });

  it('should provide intial context to rest of envelop hooks', async () => {
    const onEnvelopedFn = jest.fn((() => {}) as Plugin['onEnveloped']);
    const onParseFn = jest.fn((() => {}) as Plugin['onParse']);
    const onValidateFn = jest.fn((() => {}) as Plugin['onValidate']);
    const onContextBuildingFn = jest.fn((() => {}) as Plugin['onContextBuilding']);

    const yoga = createYoga({
      schema,
      context: userContext,
      plugins: [
        {
          onEnveloped: onEnvelopedFn,
          onParse: onParseFn,
          onValidate: onValidateFn,
          onContextBuilding: onContextBuildingFn,
        },
      ],
    });

    const response = await yoga.fetch('http://yoga/graphql?query={hello}');
    expect(response.status).toBe(200);

    const params = {
      extensions: undefined,
      operationName: undefined,
      query: '{hello}',
      variables: undefined,
    };

    expect(onEnvelopedFn.mock.lastCall?.[0].context?.params).toEqual(params);
    expect(onEnvelopedFn.mock.lastCall?.[0].context?.request).toBeDefined();

    expect(onParseFn.mock.lastCall?.[0].context.params).toEqual(params);
    expect(onParseFn.mock.lastCall?.[0].context.request).toBeDefined();

    expect(onValidateFn.mock.lastCall?.[0].context.params).toEqual(params);
    expect(onValidateFn.mock.lastCall?.[0].context.request).toBeDefined();

    expect(onContextBuildingFn.mock.lastCall?.[0].context.params).toEqual(params);
    expect(onContextBuildingFn.mock.lastCall?.[0].context.request).toBeDefined();
  });

  it('share the same context object', async () => {
    const contextObjects = new Set();
    const plugin = {
      onContextBuilding: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onEnveloped: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onParse: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onValidate: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onExecute: jest.fn(({ args }) => {
        contextObjects.add(args.contextValue);
      }),
      onRequest: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
      onRequestParse: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
      onResponse: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
    };
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [plugin],
    });
    const queryRes = await yoga.fetch('http://yoga/graphql?query={hello}', {
      myExtraContext: 'myExtraContext',
    });
    expect(queryRes.status).toBe(200);
    const queryResult = await queryRes.json();
    expect(queryResult.data.hello).toBe('world');
    expect(contextObjects.size).toBe(1);
    for (const hook of Object.keys(plugin) as (keyof typeof plugin)[]) {
      expect(plugin[hook]).toHaveBeenCalledTimes(1);
    }
    const contextObject = contextObjects.values().next().value;
    expect(contextObject).toMatchObject({
      myExtraContext: 'myExtraContext',
    });
  });
  it('share different context objects for batched requests', async () => {
    const contextObjects = new Set();
    const plugin = {
      onContextBuilding: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onEnveloped: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onParse: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onValidate: jest.fn(({ context }) => {
        contextObjects.add(context);
      }),
      onExecute: jest.fn(({ args }) => {
        contextObjects.add(args.contextValue);
      }),
      onRequest: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
      onRequestParse: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
      onResponse: jest.fn(({ serverContext }) => {
        contextObjects.add(serverContext);
      }),
    };
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [plugin],
      batching: true,
    });
    const queryRes = await yoga.fetch(
      'http://yoga/graphql',
      {
        method: 'POST',
        body: JSON.stringify([
          { query: '{hello}' },
          { query: '{__typename hello}' },
          { query: '{__typename}' },
        ]),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        myExtraContext: 'myExtraContext',
      },
    );
    expect(queryRes.status).toBe(200);
    const queryResult = await queryRes.json();
    expect(queryResult.length).toBe(3);
    expect(queryResult[0].data.hello).toBe('world');
    expect(queryResult[1].data.__typename).toBe('Query');
    expect(queryResult[1].data.hello).toBe('world');
    expect(queryResult[2].data.__typename).toBe('Query');
    // One for server context, one for each request
    expect(contextObjects.size).toBe(4);
    for (const contextObject of contextObjects) {
      expect(contextObject).toBeDefined();
      expect((contextObject as { myExtraContext: string }).myExtraContext).toBe('myExtraContext');
    }
  });

  it('retains server context prototype', async () => {
    class ServerContext {}

    let contextObject: ServerContext | undefined;
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [
        {
          onExecute: jest.fn(({ args }) => {
            contextObject = args.contextValue;
          }),
        },
      ],
    });
    const queryRes = await yoga.fetch('http://yoga/graphql?query={hello}', new ServerContext());
    await queryRes.arrayBuffer();

    expect(contextObject).toBeInstanceOf(ServerContext);
  });

  it('retains server context prototype for batched requests', async () => {
    class ServerContext {}

    let contextObject: ServerContext | undefined;
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [
        {
          onExecute: jest.fn(({ args }) => {
            contextObject = args.contextValue;
          }),
        },
      ],
      batching: true,
    });
    const queryRes = await yoga.fetch(
      'http://yoga/graphql',
      {
        method: 'POST',
        body: JSON.stringify([
          { query: '{hello}' },
          { query: '{__typename hello}' },
          { query: '{__typename}' },
        ]),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      new ServerContext(),
    );
    await queryRes.arrayBuffer();

    expect(contextObject).toBeInstanceOf(ServerContext);
  });
});
