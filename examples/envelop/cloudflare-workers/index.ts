import * as graphqljs from 'graphql';
import { getGraphQLParameters, processRequest, Response } from 'graphql-helix';
import { Router } from 'worktop';
import { listen } from 'worktop/cache';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const router = new Router();

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
  plugins: [useEngine(graphqljs), useSchema(schema), useLogger()],
});

router.add('POST', '/graphql', async (req, res) => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({
    req,
  });
  const request = {
    body: req.body,
    headers: req.headers,
    method: req.method,
    query: req.query,
  };

  const { operationName, query, variables } = getGraphQLParameters(request);
  const result = (await processRequest({
    operationName,
    query,
    variables,
    request,
    schema,
    parse,
    validate,
    execute,
    contextFactory,
  })) as Response<any, any>;

  res.send(
    result.status,
    result.payload,
    result.headers.reduce((prev, item) => ({ ...prev, [item.name]: item.value }), {}),
  );
});
listen(router.run);
