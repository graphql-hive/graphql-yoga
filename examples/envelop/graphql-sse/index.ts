import http from 'http';
import { execute, parse, subscribe, validate } from 'graphql';
import { createHandler } from 'graphql-sse';
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

const handler = createHandler({
  execute: (args: any) => args.rootValue.execute(args),
  subscribe: (args: any) => args.rootValue.subscribe(args),
  onSubscribe: async (req, res, params) => {
    const { schema, execute, subscribe, contextFactory, parse, validate } = getEnveloped({
      req,
      res,
      params,
    });

    const args = {
      schema,
      operationName: params.operationName,
      document: typeof params.query === 'string' ? parse(params.query) : params.query,
      variableValues: params.variables,
      contextValue: await contextFactory(),
      rootValue: {
        execute,
        subscribe,
      },
    };

    const errors = validate(args.schema, args.document);
    if (errors.length) throw errors[0];

    return args;
  },
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/graphql/stream')) return handler(req, res);
  return res.writeHead(404).end();
});

server.listen(3415);
