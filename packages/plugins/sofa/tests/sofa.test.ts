import { createGraphQLError, createSchema, createYoga } from 'graphql-yoga';
import { useSofa } from '@graphql-yoga/plugin-sofa';

describe('SOFA Plugin', () => {
  it('has the request in the context', async () => {
    const yoga = createYoga<{ _: string }>({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello(_root, _args, context) {
              return `Hello, ${context.request.headers.get('user-agent')}`;
            },
          },
        },
      }),
      plugins: [
        useSofa({
          basePath: '/api',
        }),
      ],
    });
    const res = await yoga.fetch('/api/hello', {
      headers: {
        'user-agent': 'test',
      },
    });
    await expect(res.text()).resolves.toEqual('"Hello, test"');
  });
  it('forwards error extensions correctly', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me: Account
          }
          type Account {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            me: () => {
              throw createGraphQLError('account not found', {
                extensions: {
                  code: 'ACCOUNT_NOT_FOUND',
                  http: { status: 404 },
                },
              });
            },
          },
        },
      }),
      plugins: [
        useSofa({
          basePath: '/api',
        }),
      ],
    });
    for (let i = 0; i < 10; i++) {
      const res = await yoga.fetch('http://localhost/api/me');
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        errors: [
          {
            message: 'account not found',
            extensions: {
              code: 'ACCOUNT_NOT_FOUND',
            },
            path: ['me'],
          },
        ],
      });
    }
  });
});
