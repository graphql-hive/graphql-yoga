import { createSchema, createYoga, GraphQLParams, YogaInitialContext } from '../src/index.js';

describe('recipe', () => {
  it('id as custom top level POST body query parameter', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            id: String
          }
        `,
        resolvers: {
          Query: {
            id: (_, __, context: YogaInitialContext) => {
              return context.params.extensions?.['id'];
            },
          },
        },
      }),
      plugins: [
        {
          /**
           * Plugin for allowing the client to send the query ID as a custom POST body query parameter.
           * Before the query parameter validation is happening it is moved to the extensions object.
           */
          onParams({ params, setParams }) {
            if ('id' in params) {
              setParams({
                ...params,
                id: undefined,
                extensions: {
                  ...params.extensions,
                  id: params.id,
                },
              } as GraphQLParams);
            }
          },
        },
      ],
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ id }',
        id: '123456',
      }),
    });

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ data: { id: '123456' } });
  });
});
