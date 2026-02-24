import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada',
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete',
  },
];

export const typeDefs = gql`
  extend type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type User @key(fields: "id") {
    id: ID!
    name: String
    username: String!
    birthDate: String
  }
`;

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: {
    Query: {
      me: () => users[0],
      users: () => users,
      user: (_, { id }) => users.find(user => user.id === id),
    },
    User: {
      __resolveReference: ({ id }) => users.find(user => user.id === id),
    },
  },
});
