import { createServer } from 'node:http';
import { createSchema, createYoga, useExecutionCancellation } from 'graphql-yoga';
import { Logger } from '@graphql-hive/logger';

const log = new Logger({ level: 'debug' });

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      user: User
    }

    type User {
      id: ID!
      name: String!
      bestFriend: User
    }
  `,
  resolvers: {
    Query: {
      async user(_, __, { request }) {
        log.info('resolving user');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 5000);
          request.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(request.signal.reason);
          });
        });
        log.info('resolved user');

        return {
          id: '1',
          name: 'Chewie',
        };
      },
    },
    User: {
      bestFriend() {
        log.info('resolving user best friend');

        return {
          id: '2',
          name: 'Han Solo',
        };
      },
    },
  },
});

// Provide your schema
const yoga = createYoga({
  plugins: [useExecutionCancellation()],
  schema,
  logging: log,
});

// Start the server and explore http://localhost:4000/graphql
const server = createServer(yoga);
server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql');
});
