import { execute, parse, subscribe, validate } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import ws from 'ws';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
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
      hello: () => 'Hello World!',
    },
    Subscription: {
      greetings: {
        subscribe: async function* sayHiIn5Languages() {
          for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
            yield { greetings: hi };
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second
          }
        },
      },
    },
  },
});

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});

useServer(
  {
    execute: (args: any) => args.rootValue.execute(args),
    subscribe: (args: any) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, msg) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } = getEnveloped({
        connectionParams: ctx.connectionParams,
        socket: ctx.extra.socket,
        request: ctx.extra.request,
      });

      const args = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
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
  new ws.Server({
    port: 3415,
    path: '/graphql',
  }),
);
