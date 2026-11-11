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

  it('allows a mutation when the GET request did not go through the HTTP handler', () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
          type Mutation {
            noop: Boolean
          }
        `,
      }),
    });
    const request = new yoga.fetchAPI.Request('http://yoga/graphql', {
      headers: { connection: 'Upgrade', upgrade: 'websocket' },
    });
    const { parse } = yoga.getEnveloped({ request });
    expect(() => parse('mutation { noop }')).not.toThrow();
  });
});
