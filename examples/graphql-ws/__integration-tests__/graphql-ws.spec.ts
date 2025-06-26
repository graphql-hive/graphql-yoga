import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { createClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga } from 'graphql-yoga';
import WebSocket from 'ws';
import { buildApp } from '../src/app.js';

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
        execute: (args: any) => args.execute(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.subscribe(args),
        onSubscribe: async (_ctx, _id, params) => {
          const { schema, execute, subscribe, contextFactory, parse, validate } =
            yoga.getEnveloped(); // <- malformed/missing context

          const args = {
            schema,
            operationName: params.operationName,
            document: parse(params.query),
            variableValues: params.variables,
            contextValue: await contextFactory(),
            execute,
            subscribe,
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
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
});
