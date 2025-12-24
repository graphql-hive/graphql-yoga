import { createServer, IncomingMessage, ServerResponse, STATUS_CODES } from 'node:http';
import { AddressInfo } from 'node:net';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { ExecutionResult } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { createDeferredPromise } from '@whatwg-node/server';
import {
  createGraphQLError,
  createSchema,
  createYoga,
  Plugin,
  useExecutionCancellation,
} from '../src/index.js';

describe('node-http', () => {
  it('should expose Node req and res objects in the context', async () => {
    const yoga = createYoga<{
      req: IncomingMessage;
      res: ServerResponse;
    }>({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            isNode: Boolean!
          }
        `,
        resolvers: {
          Query: {
            isNode: (_, __, { req, res }) => !!(req && res),
          },
        },
      }),
    });
    const server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://localhost:${port}/graphql?query=query{isNode}`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.errors).toBeUndefined();
      expect(body.data.isNode).toBe(true);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('should set status text by status code', async () => {
    const yoga = createYoga<{
      req: IncomingMessage;
      res: ServerResponse;
    }>({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            throw(status: Int): Int!
          }
        `,
        resolvers: {
          Query: {
            throw(_, { status }) {
              throw createGraphQLError('Test', {
                extensions: {
                  http: {
                    status,
                  },
                },
              });
            },
          },
        },
      }),
      logging: false,
    });
    const server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    for (const statusCodeStr in STATUS_CODES) {
      const status = Number(statusCodeStr);
      if (status < 200) continue;
      const response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query StatusTest($status: Int!) {
              throw(status: $status)
            }
          `,
          variables: { status },
        }),
      });
      expect(response.status).toBe(status);
      expect(response.statusText).toBe(STATUS_CODES[status]);
    }

    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('request cancellation causes signal passed to executor to be aborted', async () => {
    const d = createDeferredPromise();
    const didAbortD = createDeferredPromise();

    const plugin: Plugin = {
      onExecute(ctx) {
        ctx.setExecuteFn(async function execute(params) {
          d.resolve();

          return new Promise((_, rej) => {
            // @ts-expect-error Signal is not documented yet...
            params.signal.addEventListener('abort', () => {
              didAbortD.resolve();
              rej(new DOMException('The operation was aborted', 'AbortError'));
            });
          });
        });
      },
    };
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hi: String!
          }
        `,
      }),
      plugins: [plugin, useExecutionCancellation()],
    });
    const server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const controller = new AbortController();
      const response$ = fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hi
            }
          `,
        }),
        signal: controller.signal,
      });
      await d.promise;
      controller.abort();
      await expect(response$).rejects.toThrow('The operation was aborted');
      await didAbortD.promise;
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('request cancellation causes no more resolvers being invoked', async () => {
    const didInvokeSlowResolverD = createDeferredPromise();
    const didCancelD = createDeferredPromise();

    let didInvokedNestedField = false;
    const yoga = createYoga({
      plugins: [useExecutionCancellation()],
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            slow: Nested!
          }

          type Nested {
            field: String!
          }
        `,
        resolvers: {
          Query: {
            async slow() {
              didInvokeSlowResolverD.resolve();
              await didCancelD.promise;
              return {};
            },
          },
          Nested: {
            field() {
              didInvokedNestedField = true;
              return 'test';
            },
          },
        },
      }),
    });
    const server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      const controller = new AbortController();
      const response$ = fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              slow {
                field
              }
            }
          `,
        }),
        signal: controller.signal,
      });

      await didInvokeSlowResolverD.promise;
      controller.abort();
      await expect(response$).rejects.toThrow('The operation was aborted');
      // wait a few milliseconds to ensure server-side cancellation logic runs
      await setTimeout$(10);
      didCancelD.resolve();
      // wait a few milliseconds to allow the nested field resolver to run (if cancellation logic is incorrect)
      await setTimeout$(10);
      expect(didInvokedNestedField).toBe(false);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('`req: IncomingMessage` is available in batched requests', async () => {
    expect.assertions(8);
    const yoga = createYoga<{
      req: IncomingMessage;
    }>({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            isNode: Boolean!
          }
        `,
        resolvers: {
          Query: {
            isNode: (_, __, { req }) => req instanceof IncomingMessage,
          },
        },
      }),
      context: ({ req }) => ({ req }),
      batching: {
        limit: 3,
      },
    });
    const server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify([{ query: '{isNode}' }, { query: '{isNode}' }, { query: '{isNode}' }]),
      });
      expect(response.status).toBe(200);
      const body: ExecutionResult[] = await response.json();
      expect(body).toHaveLength(3);
      for (const result of body) {
        expect(result.errors).toBeUndefined();
        expect(result.data?.['isNode']).toBe(true);
      }
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
