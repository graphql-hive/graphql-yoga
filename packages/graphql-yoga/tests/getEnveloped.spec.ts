import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('getEnveloped', () => {
  it('be accessible', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'Hello World!',
          },
        },
      }),
    });

    const { schema, execute, parse, validate, contextFactory } = yoga.getEnveloped();

    const document = parse(/* GraphQL */ `
      query {
        hello
      }
    `);

    const errors = validate(schema, document);

    expect(errors).toEqual([]);

    const result = await execute({
      schema,
      document,
      contextValue: await contextFactory(),
    });

    expect(result.data).toEqual({ hello: 'Hello World!' });
  });
});
