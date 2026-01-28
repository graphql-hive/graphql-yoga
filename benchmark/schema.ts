import { createSchema } from 'graphql-yoga';
import { faker } from '@faker-js/faker';

type Book = {
  id: string;
  name: string;
  numPages: number;
};

type Author = {
  id: string;
  name: string;
  company: string;
  books: Array<Book>;
};

function generateData() {
  const authors: Array<Author> = [];
  for (let i = 0; i < 20; i++) {
    const books: Array<Book> = [];

    for (let k = 0; k < 3; k++) {
      books.push({
        id: faker.string.uuid(),
        name: faker.internet.domainName(),
        numPages: faker.number.int({
          min: 1,
          max: 1000,
        }),
      });
    }

    authors.push({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      company: faker.company.buzzPhrase(),
      books,
    });
  }

  return authors;
}

const data = generateData();

export type Context = {};

export const schema = createSchema<Context>({
  typeDefs: /* GraphQL */ `
    type Author {
      id: ID!
      name: String!
      company: String!
      books: [Book!]!
    }
    type Book {
      id: ID!
      name: String!
      numPages: Int!
    }
    type Query {
      authors: [Author!]!
    }
  `,
  resolvers: {
    Author: {},
    Query: {
      authors: () => data,
    },
  },
});
