import { createServer } from 'http';
import * as graphqljs from 'graphql';
import { createHandler } from 'graphql-http/lib/use/http';
import { envelop, useEngine, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello World!',
    },
  },
});

const getEnveloped = envelop({
  plugins: [useEngine(graphqljs), useSchema(schema), useLogger()],
});

const handler = createHandler({
  execute: (args: any) => args.rootValue.execute(args),
  onSubscribe: async (req, params) => {
    const { schema, execute, contextFactory, parse, validate } = getEnveloped({
      req: req.raw,
    });

    const args = {
      schema,
      operationName: params.operationName,
      document: parse(params.query),
      variableValues: params.variables,
      contextValue: await contextFactory(),
      rootValue: {
        execute,
      },
    };

    const errors = validate(args.schema, args.document);
    if (errors.length) return errors;

    return args;
  },
});

const server = createServer((req, res) => {
  if (req.url.startsWith('/graphql')) {
    handler(req, res);
  } else {
    res.writeHead(404).end();
  }
});

server.listen(4000);
