/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env node */
import { createServer } from 'node:http';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { parse } from 'node:url';
import next from 'next';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga } from 'graphql-yoga';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// prepare nextjs
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const app = next({ dev, hostname, port });

// match the route next would use if yoga was in `pages/api/graphql.ts`
const graphqlEndpoint = '/api/graphql';

// prepare yoga
const yoga = createYoga({
  graphqlEndpoint,
  graphiql: {
    subscriptionsProtocol: 'WS',
  },
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        clock: String!
        ping: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'world',
      },
      Subscription: {
        clock: {
          async *subscribe() {
            for (let i = 0; i < 5; i++) {
              yield { clock: new Date().toString() };
              await setTimeout$(1000);
            }
          },
        },
        ping: {
          async *subscribe() {
            yield { ping: 'pong' };
          },
        },
      },
    },
  }),
});

/**
 * @param {number} port
 * @param {import('next/dist/server/next').RequestHandler} [handle]
 */
async function start(port, handle) {
  // create http server
  const server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const url = parse(req.url, true);

      if (url.pathname.startsWith(graphqlEndpoint)) {
        await yoga(req, res);
      } else {
        if (!handle) {
          throw new Error(`Cannot handle ${url} since handler is not implemented`);
        }
        await handle(req, res, url);
      }
    } catch (err) {
      console.error(`Error while handling ${req.url}`, err);
      res.writeHead(500).end();
    }
  });

  // create websocket server
  const wsServer = new WebSocketServer({ server, path: graphqlEndpoint });

  // prepare graphql-ws
  /**
   * @typedef {import('graphql').ExecutionArgs} ExecutionArgs
   * @typedef {typeof import('graphql').execute} ExecuteFn
   * @typedef {typeof import('graphql').subscribe} SubscribeFn
   * @typedef {ExecutionArgs & {
   *   rootValue: {
   *     execute: ExecuteFn;
   *     subscribe: SubscribeFn;
   *   };
   * }} EnvelopedExecutionArgs;
   */
  useServer(
    {
      /** @param {EnvelopedExecutionArgs} args */
      execute: args => args.rootValue.execute(args),
      /** @param {EnvelopedExecutionArgs} args */
      subscribe: args => args.rootValue.subscribe(args),
      onSubscribe: async (ctx, _id, params) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params,
        });

        /** @type EnvelopedExecutionArgs */
        const args = {
          schema,
          operationName: params.operationName,
          document: parse(params.query),
          variableValues: params.variables,
          contextValue: await contextFactory(),
          rootValue: {
            execute,
            subscribe,
          },
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      },
    },
    // @ts-ignore - Typings are incorrect
    wsServer,
  );

  const sockets = new Set();

  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  await new Promise((resolve, reject) =>
    server.listen(port, err => (err ? reject(err) : resolve())),
  );

  return () =>
    new Promise(resolve => {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.closeAllConnections();
      server.close(() => resolve());
    });
}

// dont start the next.js app when testing the server
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await app.prepare();
    await start(port, app.getRequestHandler());
    console.log(`
  > App started!
    HTTP server running on http://${hostname}:${port}
    GraphQL WebSocket server running on ws://${hostname}:${port}${graphqlEndpoint}
  `);
  })();
}

export default { start };
