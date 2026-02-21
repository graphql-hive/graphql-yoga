import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import * as GraphQLJS from 'graphql';
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
      hello: () => 'World',
    },
  },
});

const getEnveloped = envelop({
  plugins: [useEngine(GraphQLJS), useSchema(schema), useLogger()],
});

const app = express();

app.use(
  '/graphql',
  graphqlHTTP(async (req, res) => {
    const { parse, validate, contextFactory, execute } = getEnveloped({
      req,
      res,
    });
    return {
      schema,
      graphiql: true,
      customParseFn: parse,
      customValidateFn: validate,
      context: await contextFactory(),
      customExecuteFn: execute,
    };
  }),
);

app.listen(4000);
