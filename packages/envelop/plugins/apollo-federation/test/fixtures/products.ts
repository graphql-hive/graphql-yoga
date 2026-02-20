import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const products = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100,
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000,
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50,
  },
];

export const typeDefs = gql`
  extend type Query {
    topProducts(first: Int = 5): [Product]
  }

  type Product @key(fields: "upc") {
    upc: String!
    name: String
    price: Int
    weight: Int
  }
`;

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: {
    Product: {
      __resolveReference(object) {
        return products.find(product => product.upc === object.upc);
      },
    },
    Query: {
      topProducts(_, args) {
        return products.slice(0, args.first);
      },
    },
  },
});
