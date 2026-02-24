import { APIGatewayProxyHandler } from 'aws-lambda';
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

export const lambdaHandler: APIGatewayProxyHandler = async event => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({
    req: event,
  });
  const request = {
    body: event.body,
    headers: event.headers,
    method: event.httpMethod,
    query: event.queryStringParameters,
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

  return {
    statusCode: 200,
    headers: result.headers.reduce((prev, item) => ({ ...prev, [item.name]: item.value }), {}),
    body: JSON.stringify(result.payload),
  };
};
