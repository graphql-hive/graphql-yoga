import { setTimeout as setTimeout$ } from 'node:timers/promises';
import Bun from 'bun';
import { makeHandler } from 'graphql-ws/use/bun';
import { createSchema, createYoga } from 'graphql-yoga';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      greetings: String
    }
    type Subscription {
      dynamicLoading(loadTime: Int!): String!
    }
  `,
  resolvers: {
    Query: {
      greetings: () => 'Hello Bun!',
    },
    Subscription: {
      dynamicLoading: {
        async *subscribe(_, { loadTime }) {
          let counter = 0;
          const spinnerFrames = ['\u25D4', '\u25D1', '\u25D5', '\u25D0'];
          while (counter < loadTime) {
            await setTimeout$(1000); // Wait for a second
            yield {
              dynamicLoading: `Loading ${spinnerFrames[counter % spinnerFrames.length]}`,
            };
            counter++;
          }
          yield { dynamicLoading: 'Loaded \u2713' };
        },
      },
    },
  },
});

const yoga = createYoga({
  schema,
  graphiql: {
    subscriptionsProtocol: 'WS', // use WebSockets instead of SSE
  },
});

export const websocketHandler = makeHandler({
  schema,
  execute: args => args.rootValue.execute(args),
  subscribe: args => args.rootValue.subscribe(args),
  onSubscribe: async (ctx, _id, params) => {
    const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
      ...ctx,
      req: ctx.extra.request,
      socket: ctx.extra.socket,
      params,
    });

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
});

const server: Bun.Server = Bun.serve({
  fetch: (request: Request, server: Bun.Server): Promise<Response> | Response => {
    // Upgrade the request to a WebSocket
    if (server.upgrade(request)) {
      return new Response();
    }
    return yoga.fetch(request, server);
  },
  port: 4000,
  websocket: websocketHandler,
});

console.info(
  `🚀 Server is running on ${new URL(
    yoga.graphqlEndpoint,
    `http://${server.hostname}:${server.port}`,
  )}`,
);
