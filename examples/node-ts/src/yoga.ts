import { createGraphQLError, createSchema, createYoga, Plugin } from 'graphql-yoga';

// available when handling requests, needs to be provided by the implementor
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ServerContext = {};

// available in GraphQL, during execution/subscription
interface UserContext {
  disableSubscription: boolean;
}

export const yoga = createYoga<ServerContext, UserContext>({
  context: {
    disableSubscription: true,
  },
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String!
      }
      type Subscription {
        greetings: String!
      }
    `,
    resolvers: {
      Query: {
        greetings: () => 'This is the `greetings` field of the root `Query` type',
      },
      Subscription: {
        greetings: {
          async *subscribe() {
            yield { greetings: 'Hi' };
          },
        },
      },
    },
  }),
  plugins: [useDisableSubscription()],
});

// context only relevant to the plugin
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type DisableSubscriptionPluginContext = {};

function useDisableSubscription(): Plugin<
  DisableSubscriptionPluginContext,
  ServerContext,
  UserContext
> {
  return {
    onSubscribe({ args }) {
      if (args.contextValue.disableSubscription) {
        throw createGraphQLError('Subscriptions have been disabled', {
          extensions: {
            http: {
              status: 400, // report error with a 400
            },
          },
        });
      }
    },
  };
}
