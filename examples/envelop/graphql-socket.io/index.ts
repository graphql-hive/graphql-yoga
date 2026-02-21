import * as http from 'http';
import { execute, parse, subscribe, validate } from 'graphql';
import { Server } from 'socket.io';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { registerSocketIOGraphQLServer } from '@n1ru4l/socket-io-graphql-server';

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

const httpServer = http.createServer();
const socketServer = new Server(httpServer);

registerSocketIOGraphQLServer({
  socketServer,
  getParameter: async ({ socket, graphQLPayload }) => {
    const { schema, contextFactory, parse, validate, execute, subscribe } = getEnveloped({
      socket,
      graphQLPayload,
    });
    return {
      parse,
      validate,
      execute,
      subscribe,
      graphQLExecutionParameter: {
        schema,
        contextValue: await contextFactory(),
      },
    };
  },
});

httpServer.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Listening on http://localhost:3000');
});
