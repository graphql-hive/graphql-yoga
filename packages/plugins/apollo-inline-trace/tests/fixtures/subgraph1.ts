import { GraphQLSchema, parse } from 'graphql';
import { createGraphQLError } from 'graphql-yoga';

const typeDefs = parse(/* GraphQL */ `
  type Query {
    testNestedField: TestNestedField
  }

  type TestNestedField {
    subgraph1: TestUser1
    nonNullableFail: TestUser1!
    nullableFail: TestUser1
  }

  type TestUser1 {
    id: String!
    email: String!
    sub1: Boolean!
  }
`);

const resolvers = {
  Query: {
    testNestedField: () => ({
      subgraph1: () => ({
        id: 'user1',
        email: 'user1@example.com',
        sub1: true,
      }),
      nonNullableFail: () => {
        throw createGraphQLError('My original subgraph error!', {
          extensions: {
            code: 'BAD_REQUEST',
          },
        });
      },
      nullableFail: () => {
        throw createGraphQLError('My original subgraph error!', {
          extensions: {
            code: 'BAD_REQUEST',
          },
        });
      },
    }),
  },
};

export async function getSubgraph1Schema(): Promise<GraphQLSchema> {
  // dynamic import is used only due to incompatibility with graphql@15
  const { buildSubgraphSchema } = await import('@apollo/subgraph');
  return buildSubgraphSchema({ typeDefs, resolvers });
}
