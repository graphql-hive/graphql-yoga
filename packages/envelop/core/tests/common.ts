import { makeExecutableSchema } from '@graphql-tools/schema';

export const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      me: User!
      alphabet: [String]!
    }
    type User {
      id: ID!
      name: String!
    }

    type Subscription {
      alphabet: String!
      message: String!
    }
  `,
  resolvers: {
    Query: {
      me: () => {
        return { _id: 1, firstName: 'Dotan', lastName: 'Simha' };
      },
    },
    Subscription: {
      message: {
        subscribe: (_, __, context) => {
          if (!context || 'subscribeSource' in context === false) {
            throw new Error('No subscribeSource provided for context :(');
          }
          return context.subscribeSource;
        },
        resolve: (_, __, context) => context.message,
      },
    },
    User: {
      id: u => u._id,
      name: u => `${u.firstName} ${u.lastName}`,
    },
  },
});

export const query = /* GraphQL */ `
  query me {
    me {
      id
      name
    }
  }
`;

export const subscriptionOperationString = /* GraphQL */ `
  subscription {
    message
  }
`;
