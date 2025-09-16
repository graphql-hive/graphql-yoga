import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('Handle non GraphQL Errors as 500 when error masking is disabled', () => {
  const errorVariationsForContextFactory = {
    Object: { toString: () => 'Oops!' },
    String: 'Oops!',
  };
  for (const [name, error] of Object.entries(errorVariationsForContextFactory)) {
    it(`${name} from context factory`, async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              _: String
            }
          `,
        }),
        context: () => {
          throw error;
        },
        maskedErrors: false,
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          accept: 'application/graphql-response+json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      expect(await response.json()).toStrictEqual({
        errors: [
          {
            message: 'Oops!',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
        ],
      });
      expect(response.status).toBe(500);
    });
  }
});
