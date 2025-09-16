import { createServer } from 'node:http';
import { createPubSub, createSchema, createYoga } from 'graphql-yoga';
import { Redis } from 'ioredis';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';

const publishClient = new Redis();
const subscribeClient = new Redis();

const pubSub = createPubSub<{
  message: [string];
}>({
  eventTarget: createRedisEventTarget({
    publishClient,
    subscribeClient,
  }),
});

const yoga = createYoga<{ pubSub: typeof pubSub }>({
  context: () => ({ pubSub }),
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        _: Boolean
      }

      type Subscription {
        message: String!
      }

      type Mutation {
        sendMessage(message: String!): Boolean
      }
    `,
    resolvers: {
      Subscription: {
        message: {
          subscribe: (_, __, context) => context.pubSub.subscribe('message'),
          resolve: message => message,
        },
      },
      Mutation: {
        sendMessage(_, { message }, context) {
          context.pubSub.publish('message', message);
        },
      },
    },
  }),
});

const server = createServer(yoga);
server.listen(parseInt(process.env.PORT || '4000', 10));
