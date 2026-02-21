import { execute, parse, subscribe, validate } from 'graphql';
import { getGraphQLParameters, processRequest, Response } from 'graphql-helix';
import type { AzureFunction, Context, HttpRequest } from '@azure/functions';
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

export const index: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
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

  context.res = {
    status: 200,
    headers: result.headers.reduce((prev, item) => ({ ...prev, [item.name]: item.value }), {}),
    body: JSON.stringify(result.payload),
  };
};
