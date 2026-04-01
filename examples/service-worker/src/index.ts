import { createSchema, createYoga, Repeater } from 'graphql-yoga';

// @ts-expect-error - We know this global variable is set by the bundler
const graphqlEndpoint: string = globalThis.GRAPHQL_ROUTE || '/graphql';

const yoga = createYoga({
  graphqlEndpoint,
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
      }
      type Subscription {
        time: String
      }
    `,
    resolvers: {
      Query: {
        greetings: () => 'This is the `greetings` field of the root `Query` type',
      },
      Subscription: {
        time: {
          subscribe: () =>
            new Repeater((push, end) => {
              const interval = setInterval(() => push(new Date().toISOString()), 1000);
              end.then(() => clearInterval(interval));
            }),
          resolve: value => value,
        },
      },
    },
  }),
});

self.addEventListener('fetch', yoga);
