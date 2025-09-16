/* eslint-disable import/no-extraneous-dependencies */
import { GraphQLSchema, parse } from 'graphql';

const typeDefs = parse(/* GraphQL */ `
  type Query {
    testNestedField: TestNestedField
  }

  type TestNestedField {
    subgraph2: TestUser2
  }

  type TestUser2 {
    id: String!
    email: String!
    sub2: Boolean!
  }
`);

const resolvers = {
  Query: {
    testNestedField: () => ({
      subgraph2: () => ({
        id: 'user2',
        email: 'user2@example.com',
        sub2: true,
      }),
    }),
  },
};

export async function getSubgraph2Schema(): Promise<GraphQLSchema> {
  // dynamic import is used only due to incompatibility with graphql@15
  const { buildSubgraphSchema } = await import('@apollo/subgraph');
  return buildSubgraphSchema({ typeDefs, resolvers });
}
