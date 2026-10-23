// Next.js Custom Route Handler: https://nextjs.org/docs/app/building-your-application/routing/router-handlers
import { createSchema, createYoga } from 'graphql-yoga';

interface NextContext {
  params: Promise<Record<string, string>>;
}

const { handleRequest } = createYoga<NextContext>({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
      }
    `,
    resolvers: {
      Query: {
        greetings: () => 'This is the `greetings` field of the root `Query` type',
      },
    },
  }),

  // While using Next.js file convention for routing, we need to configure Yoga to use the correct endpoint
  graphqlEndpoint: '/api/graphql',

  // Integration tests set a tight limit to assert 413 through a real `NextRequest`
  // (native Request subclass, often behind Next.js's Proxy). See #4633.
  ...(process.env.YOGA_MAX_REQUEST_BODY_SIZE
    ? { maxRequestBodySize: Number(process.env.YOGA_MAX_REQUEST_BODY_SIZE) }
    : {}),
});

export { handleRequest as GET, handleRequest as POST };
