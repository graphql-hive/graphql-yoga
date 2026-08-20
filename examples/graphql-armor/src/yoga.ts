import { versionInfo } from 'graphql';
import { createSchema, createYoga, Plugin } from 'graphql-yoga';
import { EnvelopArmor } from '@escape.tech/graphql-armor';

const armor = new EnvelopArmor();
const enhancements = armor.protect();

const booksStore = [
  {
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];

export const yoga = createYoga({
  plugins: [
    ...enhancements.plugins,
    // In GraphQL>=17 we have the `hideSuggesstions` option instead.
    ...(versionInfo.major >= 17
      ? [
          {
            onValidate(params) {
              params.setValidationFn((s, d, r, options) =>
                params.validateFn(s, d, r, { ...options, hideSuggestions: true }),
              );
            },
          } satisfies Plugin,
        ]
      : []),
  ],
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Book {
        title: String
        author: String
      }
      type Query {
        books: [Book]
      }
    `,
    resolvers: {
      Query: {
        books: () => booksStore,
      },
    },
  }),
});
