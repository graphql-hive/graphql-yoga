import * as functions from 'firebase-functions';
import { execute, parse, subscribe, validate } from 'graphql';
import { getGraphQLParameters, processRequest, Response } from 'graphql-helix';
import { envelop, useLogger, useSchema } from '@envelop/core';
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
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});

// https://firebase.google.com/docs/functions/typescript
export const helloWorld = functions.https.onRequest(async (req, res) => {
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

  res.status(200);
  result.headers.forEach(header => res.header(header.name, header.value));
  res.send(JSON.stringify(result.payload));
});
