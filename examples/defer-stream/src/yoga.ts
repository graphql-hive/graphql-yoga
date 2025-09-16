import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { createSchema, createYoga } from 'graphql-yoga';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';

const typeDefs = /* GraphQL */ `
  type Query {
    """
    Resolves the alphabet slowly. 1 character per second
    Maybe you want to @stream this field ;)
    """
    alphabet(waitFor: Int! = 1000): [String]

    """
    A field that resolves fast.
    """
    fastField: String!

    """
    A field that resolves slowly.
    Maybe you want to @defer this field ;)
    """
    slowField(waitFor: Int! = 5000): String
  }
`;

const alphabet = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
];

const resolvers = {
  Query: {
    async *alphabet(_, { waitFor }) {
      for (const character of alphabet) {
        yield character;
        await setTimeout$(waitFor);
      }
    },
    fastField: async () => {
      await setTimeout$(100);
      return 'I am speed';
    },
    slowField: async (_, { waitFor }) => {
      await setTimeout$(waitFor);
      return 'I am slow';
    },
  },
};

export const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  plugins: [useDeferStream()],
  renderGraphiQL,
  graphiql: {
    defaultQuery: /* GraphQL */ `
      # Slow alphabet
      query Alphabet {
        alphabet
      }

      # Stream Alphabet
      query StreamAlphabet {
        alphabet @stream
      }

      # Quick field
      query QuickFieldOnly {
        fastField
      }

      # Slow field
      query SlowFieldOnly {
        slowField
      }

      # Slow and Fast field
      query SlowAndFastField {
        slowField
        fastField
      }

      # Slow and Fast using defer
      query SlowAndFastFieldWithDefer {
        ... on Query @defer {
          slowField
        }
        fastField
      }

    `
      .split('\n')
      .map(line => line.replace('      ', ''))
      .join('\n'),
  },
});
