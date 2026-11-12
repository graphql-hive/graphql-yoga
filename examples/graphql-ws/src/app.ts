import { createServer } from 'node:http';
import { Socket } from 'node:net';
import { GraphQLError, parse } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga } from 'graphql-yoga';
import { WebSocketServer } from 'ws';
import { normalizeNodeRequest } from '@whatwg-node/server';

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

// `graphql-ws` always calls `getOperationAST(execArgs.document, ...)` to decide whether to
// dispatch to the configured `execute` or `subscribe` function, even when `onSubscribe` already
// returns a result. The real document (which may differ from `params.query`, e.g. for a
// persisted operation) was already parsed, validated and executed inside `getResultForParams`
// below, so this placeholder - deliberately anonymous, so it matches regardless of the real
// operation's name - only needs to parse. Which branch `getOperationAST` picks doesn't matter
// either: both `execute` and `subscribe` above just return the already-computed result.
const PLACEHOLDER_DOCUMENT = parse('{ __typename }');

export function buildApp() {
  const yoga = createYoga({
    graphiql: {
      subscriptionsProtocol: 'WS',
    },
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
        type Mutation {
          dontChange: String!
        }
        type Subscription {
          greetings: String!
        }
      `,
      resolvers: {
        Query: {
          hello() {
            return 'world';
          },
        },
        Mutation: {
          dontChange() {
            return 'didntChange';
          },
        },
        Subscription: {
          greetings: {
            async *subscribe() {
              for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
                yield { greetings: hi };
              }
            },
          },
        },
      },
    }),
  });

  const server = createServer(yoga);
  const wss = new WebSocketServer({
    server,
    path: yoga.graphqlEndpoint,
  });

  useServer(
    {
      // The operation already ran inside `onSubscribe` below, so `execute`/`subscribe`
      // here just hand back the result that was stashed on `args`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: (args: any) => args.result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscribe: (args: any) => args.result,
      onSubscribe: async (ctx, _id, params) => {
        const request = normalizeNodeRequest(ctx.extra.request, yoga.fetchAPI);

        // Routing the operation through `getResultForParams` (instead of calling
        // `getEnveloped`'s `parse`/`validate`/`execute` by hand) runs Yoga's `onParams`
        // hooks first, so plugins enforced there apply over WebSocket the same way they
        // already do over HTTP.
        let result;
        try {
          result = await yoga.getResultForParams(
            // `graphql-ws`'s `SubscribePayload` allows `null` for these fields; Yoga's
            // `GraphQLParams` only accepts `undefined`.
            {
              params: {
                ...params,
                operationName: params.operationName ?? undefined,
                variables: params.variables ?? undefined,
                extensions: params.extensions ?? undefined,
              },
              request,
            },
            { ...ctx, req: ctx.extra.request, socket: ctx.extra.socket },
          );
        } catch (error) {
          // Report the error for just this operation instead of throwing, which would
          // close the whole socket and take down every other operation sharing it.
          return [
            error instanceof GraphQLError ? error : new GraphQLError('Internal server error.'),
          ];
        }

        if (!result) {
          return [new GraphQLError('Unexpected empty result.')];
        }
        if (!isAsyncIterable(result) && result.data == null && result.errors?.length) {
          return result.errors;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { document: PLACEHOLDER_DOCUMENT, result } as any;
      },
    },
    wss,
  );

  // for termination
  const sockets = new Set<Socket>();
  server.on('connection', socket => {
    sockets.add(socket);
    server.once('close', () => sockets.delete(socket));
  });

  return {
    start: (port: number) =>
      new Promise<void>((resolve, reject) => {
        server.on('error', err => reject(err));
        server.on('listening', () => resolve());
        server.listen(port);
      }),
    stop: () =>
      new Promise<void>(resolve => {
        for (const socket of sockets) {
          socket.destroy();
          sockets.delete(socket);
        }
        server.close(() => resolve());
      }),
  };
}
