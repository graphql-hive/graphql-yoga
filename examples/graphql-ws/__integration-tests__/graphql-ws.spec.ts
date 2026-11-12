import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { GraphQLError, parse } from 'graphql';
import type { SubscribePayload } from 'graphql-ws';
import { createClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga } from 'graphql-yoga';
import WebSocket from 'ws';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { normalizeNodeRequest } from '@whatwg-node/server';
import { buildApp } from '../src/app.js';

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

// See the matching constant in `../src/app.ts` for why this placeholder document is needed.
const PLACEHOLDER_DOCUMENT = parse('{ __typename }');

// `SubscribePayload`'s fields allow `null`; Yoga's `GraphQLParams` only accepts `undefined`.
function toGraphQLParams(params: SubscribePayload) {
  return {
    ...params,
    operationName: params.operationName ?? undefined,
    variables: params.variables ?? undefined,
    extensions: params.extensions ?? undefined,
  };
}

describe('graphql-ws example integration', () => {
  const app = buildApp();
  function findAvailablePort() {
    return new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        server.close(() => resolve(port));
      });
      server.once('error', reject);
    });
  }
  let url: string;
  beforeAll(async () => {
    const port = await findAvailablePort();
    url = `ws://localhost:${port}/graphql`;
    return app.start(port);
  });
  afterAll(() => app.stop());

  it('should execute query', async () => {
    const client = createClient({
      webSocketImpl: WebSocket,
      url,
      retryAttempts: 0, // fail right away
    });

    const onNext = jest.fn();

    await new Promise<void>((resolve, reject) => {
      client.subscribe(
        { query: '{ hello }' },
        {
          next: onNext,
          error: reject,
          complete: resolve,
        },
      );
    });

    expect(onNext).toHaveBeenCalledWith({ data: { hello: 'world' } });
  });

  it('should execute mutation', async () => {
    const client = createClient({
      webSocketImpl: WebSocket,
      url,
      retryAttempts: 0, // fail right away
    });

    const onNext = jest.fn();

    await new Promise<void>((resolve, reject) => {
      client.subscribe(
        { query: 'mutation { dontChange }' },
        {
          next: onNext,
          error: reject,
          complete: resolve,
        },
      );
    });

    expect(onNext).toHaveBeenCalledWith({ data: { dontChange: 'didntChange' } });
  });

  it('should subscribe', async () => {
    const client = createClient({
      webSocketImpl: WebSocket,
      url,
      retryAttempts: 0, // fail right away
    });

    const onNext = jest.fn();

    await new Promise<void>((resolve, reject) => {
      client.subscribe(
        { query: 'subscription { greetings }' },
        {
          next: onNext,
          error: reject,
          complete: resolve,
        },
      );
    });

    expect(onNext).toHaveBeenCalledTimes(5);
    expect(onNext).toHaveBeenCalledWith({ data: { greetings: 'Hi' } });
  });

  it('should not fail if context is not as per the documentation', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello() {
              return 'world';
            },
          },
        },
      }),
    });

    const server = createServer(yoga);

    const wsServer = useServer(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: (args: any) => args.result,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.result,
        onSubscribe: async (ctx, _id, params) => {
          const request = normalizeNodeRequest(ctx.extra.request, yoga.fetchAPI);

          // `{}` here, not `{ ...ctx, req: ..., socket: ... }`: malformed/missing context.
          const result = await yoga.getResultForParams(
            { params: toGraphQLParams(params), request },
            {},
          );

          if (!isAsyncIterable(result) && result?.data == null && result?.errors?.length) {
            return result.errors;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { document: PLACEHOLDER_DOCUMENT, result } as any;
        },
      },
      new WebSocket.WebSocketServer({
        server,
        path: yoga.graphqlEndpoint,
      }),
    );

    const port = await findAvailablePort();

    await new Promise<void>((resolve, reject) => {
      server.on('error', err => reject(err));
      server.on('listening', () => resolve());
      server.listen(port);
    });

    //

    const client = createClient({
      webSocketImpl: WebSocket,
      url: `ws://localhost:${port}/graphql`,
      retryAttempts: 0, // fail right away
    });

    const onNext = jest.fn();

    await new Promise<void>((resolve, reject) => {
      client.subscribe(
        { query: '{ hello }' },
        {
          next: onNext,
          error: reject,
          complete: resolve,
        },
      );
    });

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith({ data: { hello: 'world' } });

    //

    await client.dispose();
    await wsServer.dispose();
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  it('should use the schema returned by a schema factory', async () => {
    const createGreetingSchema = (greeting: string) =>
      createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello() {
              return greeting;
            },
          },
        },
      });
    const frenchSchema = createGreetingSchema('bonjour');
    const englishSchema = createGreetingSchema('world');
    const yoga = createYoga<{ connectionParams?: Readonly<Record<string, unknown>> }>({
      schema: ({ connectionParams }) =>
        connectionParams?.['lang'] === 'fr' ? frenchSchema : englishSchema,
    });

    const server = createServer(yoga);

    const wsServer = useServer(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: (args: any) => args.result,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.result,
        onSubscribe: async (ctx, _id, params) => {
          const request = normalizeNodeRequest(ctx.extra.request, yoga.fetchAPI);
          const context = { ...ctx, req: ctx.extra.request, socket: ctx.extra.socket };
          const result = await yoga.getResultForParams(
            { params: toGraphQLParams(params), request },
            context,
          );

          if (!isAsyncIterable(result) && result?.data == null && result?.errors?.length) {
            return result.errors;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { document: PLACEHOLDER_DOCUMENT, result } as any;
        },
      },
      new WebSocket.WebSocketServer({
        server,
        path: yoga.graphqlEndpoint,
      }),
    );

    const port = await findAvailablePort();

    await new Promise<void>((resolve, reject) => {
      server.on('error', err => reject(err));
      server.on('listening', () => resolve());
      server.listen(port);
    });

    //

    const queryHello = async (lang: string) => {
      const client = createClient({
        webSocketImpl: WebSocket,
        url: `ws://localhost:${port}/graphql`,
        connectionParams: { lang },
        retryAttempts: 0, // fail right away
      });
      const onNext = jest.fn();
      await new Promise<void>((resolve, reject) => {
        client.subscribe(
          { query: '{ hello }' },
          {
            next: onNext,
            error: reject,
            complete: resolve,
          },
        );
      });
      await client.dispose();
      return onNext;
    };

    expect(await queryHello('fr')).toHaveBeenCalledWith({ data: { hello: 'bonjour' } });
    expect(await queryHello('en')).toHaveBeenCalledWith({ data: { hello: 'world' } });

    //

    await wsServer.dispose();
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  describe('persisted operations enforcement', () => {
    let dangerousCallCount = 0;

    const store = new Map<string, string>([['allowed', '{ secret }']]);

    function setUpProtectedServer() {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              secret: String!
            }
            type Mutation {
              dangerous: String!
            }
          `,
          resolvers: {
            Query: { secret: () => 'leaked' },
            Mutation: {
              dangerous: () => {
                dangerousCallCount++;
                return 'done';
              },
            },
          },
        }),
        plugins: [
          usePersistedOperations({
            getPersistedOperation(key: string) {
              return store.get(key) ?? null;
            },
          }),
        ],
      });

      const server = createServer(yoga);
      const wsServer = useServer(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: (args: any) => args.result,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subscribe: (args: any) => args.result,
          onSubscribe: async (ctx, _id, params) => {
            const request = normalizeNodeRequest(ctx.extra.request, yoga.fetchAPI);
            let result;
            try {
              result = await yoga.getResultForParams(
                { params: toGraphQLParams(params), request },
                { ...ctx, req: ctx.extra.request, socket: ctx.extra.socket },
              );
            } catch (error) {
              return [error instanceof GraphQLError ? error : new GraphQLError('Internal error.')];
            }
            if (!isAsyncIterable(result) && result?.data == null && result?.errors?.length) {
              return result.errors;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { document: PLACEHOLDER_DOCUMENT, result } as any;
          },
        },
        new WebSocket.WebSocketServer({ server, path: yoga.graphqlEndpoint }),
      );
      return { server, wsServer };
    }

    async function subscribeOnce(url: string, query: string, extensions?: Record<string, unknown>) {
      const client = createClient({ webSocketImpl: WebSocket, url, retryAttempts: 0 });
      try {
        return await new Promise<unknown>((resolve, reject) => {
          client.subscribe(
            { query, extensions },
            {
              next: resolve,
              // `onSubscribe` returning an error array rejects via the `error` sink, not `next`.
              error: errors => resolve({ errors }),
              complete: () => reject(new Error('expected a result')),
            },
          );
        });
      } finally {
        await client.dispose();
      }
    }

    beforeEach(() => {
      dangerousCallCount = 0;
    });

    it('rejects an arbitrary query', async () => {
      const { server, wsServer } = setUpProtectedServer();
      const port = await findAvailablePort();
      await new Promise<void>((resolve, reject) => {
        server.on('error', reject);
        server.on('listening', () => resolve());
        server.listen(port);
      });

      const result = await subscribeOnce(`ws://localhost:${port}/graphql`, '{ secret }');
      expect((result as { errors?: Array<{ message: string }> }).errors?.[0]?.message).toBe(
        'PersistedQueryOnly',
      );

      await wsServer.dispose();
      await new Promise<void>(resolve => server.close(() => resolve()));
    });

    it('does not run the mutation resolver for a non-persisted mutation', async () => {
      const { server, wsServer } = setUpProtectedServer();
      const port = await findAvailablePort();
      await new Promise<void>((resolve, reject) => {
        server.on('error', reject);
        server.on('listening', () => resolve());
        server.listen(port);
      });

      const result = await subscribeOnce(
        `ws://localhost:${port}/graphql`,
        'mutation { dangerous }',
      );
      expect((result as { errors?: Array<{ message: string }> }).errors?.[0]?.message).toBe(
        'PersistedQueryOnly',
      );
      expect(dangerousCallCount).toBe(0);

      await wsServer.dispose();
      await new Promise<void>(resolve => server.close(() => resolve()));
    });

    it('still executes a persisted operation', async () => {
      const { server, wsServer } = setUpProtectedServer();
      const port = await findAvailablePort();
      await new Promise<void>((resolve, reject) => {
        server.on('error', reject);
        server.on('listening', () => resolve());
        server.listen(port);
      });

      const result = await subscribeOnce(`ws://localhost:${port}/graphql`, '', {
        persistedQuery: { version: 1, sha256Hash: 'allowed' },
      });
      expect(result).toEqual({ data: { secret: 'leaked' } });

      await wsServer.dispose();
      await new Promise<void>(resolve => server.close(() => resolve()));
    });
  });
});
