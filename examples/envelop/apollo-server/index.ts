/* eslint-disable no-console */
import { execute, parse, subscribe, validate } from 'graphql';
import { ApolloServer } from '@apollo/server';
import {
  GatewayApolloConfig,
  GatewayExecutor,
  GatewayInterface,
  GatewayLoadResult,
  GatewaySchemaLoadOrUpdateCallback,
  GatewayUnsubscriber,
} from '@apollo/server-gateway-interface';
import { startStandaloneServer } from '@apollo/server/standalone';
import { envelop, useEngine, useSchema } from '@envelop/core';
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
  plugins: [useEngine({ parse, validate, subscribe, execute }), useSchema(schema)],
});

const executor: GatewayExecutor = async requestContext => {
  const { schema, execute, contextFactory } = getEnveloped({
    req: requestContext.request.http,
  });

  return execute({
    schema,
    document: requestContext.document,
    contextValue: await contextFactory(),
    variableValues: requestContext.request.variables,
    operationName: requestContext.operationName,
  });
};

// Apollo Server 4 requires a custom gateway to enable custom executors:
// https://www.apollographql.com/docs/apollo-server/migration/#executor
class Gateway implements GatewayInterface {
  private schemaCallback?: GatewaySchemaLoadOrUpdateCallback;

  async load(options: { apollo: GatewayApolloConfig }): Promise<GatewayLoadResult> {
    // Apollo expects this schema to be called before this function resolves:
    // https://github.com/apollographql/apollo-server/issues/7340#issuecomment-1407071706
    this.schemaCallback?.({ apiSchema: schema, coreSupergraphSdl: '' });

    return { executor };
  }

  onSchemaLoadOrUpdate(callback: GatewaySchemaLoadOrUpdateCallback): GatewayUnsubscriber {
    this.schemaCallback = callback;
    return () => {};
  }

  async stop() {}
}

const server = new ApolloServer({
  gateway: new Gateway(),
});

(async () => {
  await startStandaloneServer(server, {
    listen: { port: 3000 },
  });
})();
