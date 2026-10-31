import { createServer } from 'node:http';
import {
  createPubSub,
  createSchema,
  createYoga,
  map,
  pipe,
  Repeater,
  YogaInitialContext,
} from 'graphql-yoga';
import { Resolvers } from './generated/graphql';

const typeDefs = /* GraphQL */ `
  type Query {
    """
    Simple field that return a "Hello world!" string.
    """
    hello: String!
  }

  type Subscription {
    """
    Count up from 0 to Infinity.
    """
    counter: Int!
    """
    Subscribe to the global counter that can be incremented with the 'incrementGlobalCounter' mutation.
    """
    globalCounter: Int!
  }

  type Mutation {
    """
    Increment the global counter by one. Returns the current global counter value after incrementing.
    """
    incrementGlobalCounter: Int!
  }
`;

let globalCounter = 0;

const pubSub = createPubSub<{
  'globalCounter:changed': [];
}>();

interface Context extends YogaInitialContext {
  pubSub: typeof pubSub;
}

const resolvers: Resolvers<Context> = {
  Query: {
    hello: () => `Hello world!`,
  },
  Subscription: {
    counter: {
      subscribe: () =>
        new Repeater((push, stop) => {
          let counter = 0;
          function increment() {
            push(counter++);
            console.log('push');
          }
          increment();
          const interval = setInterval(increment, 1000);
          stop.then(() => {
            clearInterval(interval);
            console.log('stop');
          });
        }),
      resolve: (payload: number) => payload,
    },
    globalCounter: {
      // Merge initial value with source stream of new values
      subscribe: (_, _args, context) =>
        pipe(
          Repeater.merge([
            // cause an initial event so the globalCounter is streamed to the client
            // upon initiating the subscription
            undefined,
            // event stream for future updates
            context.pubSub.subscribe('globalCounter:changed'),
          ]),
          // map all events to the latest globalCounter
          map(() => globalCounter),
        ),
      resolve: (payload: number) => payload,
    },
  },
  Mutation: {
    incrementGlobalCounter: (_source, _args, context) => {
      globalCounter++;
      context.pubSub.publish('globalCounter:changed');
      return globalCounter;
    },
  },
};

const yoga = createYoga<Context>({
  schema: createSchema({
    resolvers,
    typeDefs,
  }),
  context: { pubSub },
});

const server = createServer(yoga);
server.listen(4000, () => console.log('Server started on port 4000'));
