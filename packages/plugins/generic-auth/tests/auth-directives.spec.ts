import { parse } from 'graphql';
import { useGenericAuth } from '@envelop/generic-auth';
import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('Auth Directives', () => {
  const authDirectives = /* GraphQL */ `
    directive @requiresScopes(scopes: [[String!]!]!) on OBJECT | FIELD_DEFINITION

    directive @authenticated on OBJECT | FIELD_DEFINITION

    directive @policy(policies: [[String!]!]!) on OBJECT | FIELD_DEFINITION
  `;
  const users = [
    {
      id: '1',
      username: 'john.doe',
      email: 'john@doe.com',
      profileImage: 'https://example.com/john.jpg',
    },
    {
      id: '2',
      username: 'jane.doe',
      email: 'jane@doe.com',
      profileImage: 'https://example.com/jane.jpg',
    },
  ];
  const posts = [
    {
      id: '1',
      authorId: '1',
      title: 'Securing supergraphs',
      content: 'Supergraphs are the future!',
      views: 100,
      publishAt: '2021-01-01',
      allowedViewers: [users[0], users[1]],
    },
    {
      id: '2',
      authorId: '2',
      title: 'Running supergraphs',
      content: 'Supergraphs are the best!',
      views: 200,
      publishAt: '2021-01-02',
      allowedViewers: [users[1]],
    },
  ];
  describe('@requiresScopes', () => {
    it('works', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          ${authDirectives}
          type Query {
            user(id: ID!): User @requiresScopes(scopes: [["read:others"]])
            users: [User!]! @requiresScopes(scopes: [["read:others"]])
            post(id: ID!): Post
          }

          type User {
            id: ID!
            username: String
            email: String @requiresScopes(scopes: [["read:email"]])
            profileImage: String
            posts: [Post!]!
          }

          type Post {
            id: ID!
            author: User!
            title: String!
            content: String!
          }
        `,
        resolvers: {
          Query: {
            user: (_, { id }) => users.find(user => user.id === id),
            users: () => users,
            post: (_, { id }) => posts.find(post => post.id === id),
          },
          User: {
            posts: user => posts.filter(post => post.authorId === user.id),
          },
          Post: {
            author: post => users.find(user => user.id === post.authorId),
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn(context) {
              return context?.['auth'];
            },
            rejectUnauthenticated: false,
          }),
        ],
        schema,
      );
      const response = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            user(id: "1") {
              username
              profileImage
              email
            }
          }
        `),
        {},
        {
          auth: { sub: '123', scope: 'read:others' },
        },
      );
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        data: {
          user: {
            username: 'john.doe',
            profileImage: 'https://example.com/john.jpg',
            email: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              http: {
                status: 401,
              },
            },
            locations: [
              {
                line: 6,
                column: 15,
              },
            ],
            path: ['user', 'email'],
          },
        ],
      });
    });
  });
  describe('@authenticated', () => {
    it('works', async () => {
      const schema = makeExecutableSchema({
        typeDefs: parse(/* GraphQL */ `
          ${authDirectives}
          type Query {
            me: User @authenticated
            post(id: ID!): Post
          }

          type User {
            id: ID!
            username: String
            email: String @requiresScopes(scopes: [["read:email"]])
            posts: [Post!]!
          }

          type Post {
            id: ID!
            author: User!
            title: String!
            content: String!
            views: Int @authenticated
          }
        `),
        resolvers: {
          Query: {
            me: () => users[0],
            post: (_, { id }) => posts.find(post => post.id === id),
          },
          User: {
            posts: user => posts.filter(post => post.authorId === user.id),
          },
          Post: {
            author: post => users.find(user => user.id === post.authorId),
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn(context) {
              return context?.['auth'];
            },
            rejectUnauthenticated: false,
          }),
        ],
        schema,
      );
      const response = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            me {
              username
            }
            post(id: "1") {
              title
              views
            }
          }
        `),
        {},
        {},
      );
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        data: {
          me: null,
          post: {
            title: 'Securing supergraphs',
            views: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            path: ['me'],
            locations: [
              {
                line: 3,
                column: 13,
              },
            ],
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              http: {
                status: 401,
              },
            },
          },
          {
            message: 'Unauthorized field or type',
            path: ['post', 'views'],
            locations: [
              {
                line: 8,
                column: 15,
              },
            ],
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              http: {
                status: 401,
              },
            },
          },
        ],
      });
    });
    it('interfaces', async () => {
      const schema = makeExecutableSchema({
        typeDefs: parse(/* GraphQL */ `
          ${authDirectives}
          type Query {
            posts: [Post!]!
          }

          type User {
            id: ID!
            username: String
            posts: [Post!]!
          }

          interface Post {
            id: ID!
            author: User!
            title: String!
            content: String!
          }

          type PrivateBlog implements Post @authenticated {
            id: ID!
            author: User!
            title: String!
            content: String!
            publishAt: String
            allowedViewers: [User!]!
          }
        `),
        resolvers: {
          Post: {
            __resolveType: () => 'PrivateBlog',
          },
          PrivateBlog: {
            author: post => users.find(user => user.id === post.authorId),
          },
          Query: {
            posts: () => posts,
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn(context) {
              return context?.['auth'];
            },
            rejectUnauthenticated: false,
          }),
        ],
        schema,
      );
      const response = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            posts {
              id
              author {
                username
              }
              title
              ... on PrivateBlog {
                allowedViewers {
                  username
                }
              }
            }
          }
        `),
        {},
        {},
      );
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        data: {
          posts: [
            {
              id: '1',
              author: {
                username: 'john.doe',
              },
              title: 'Securing supergraphs',
              allowedViewers: null,
            },
            {
              id: '2',
              author: {
                username: 'jane.doe',
              },
              title: 'Running supergraphs',
              allowedViewers: null,
            },
          ],
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              http: {
                status: 401,
              },
            },
            locations: [
              {
                column: 17,
                line: 10,
              },
            ],
            path: ['posts', 'allowedViewers'],
          },
        ],
      });
    });
  });
  describe('@policy', () => {
    it('works', async () => {
      const schema = makeExecutableSchema({
        typeDefs: parse(/* GraphQL */ `
          ${authDirectives}
          type Query {
            me: User @authenticated @policy(policies: [["read_profile"]])
            post(id: ID!): Post
          }

          type User {
            id: ID!
            username: String
            email: String @requiresScopes(scopes: [["read:email"]])
            posts: [Post!]!
            credit_card: String @policy(policies: [["read_credit_card"]])
          }

          type Post {
            id: ID!
            author: User!
            title: String!
            content: String!
            views: Int @authenticated
          }
        `),
        resolvers: {
          Query: {
            me: () => ({
              id: '1',
              username: 'john.doe',
              email: 'john@doe.com',
              posts: posts.filter(post => post.authorId === '1'),
              credit_card: '1234-5678-9012-3456',
            }),
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn() {
              return {
                scope: ['read:email'],
              };
            },
            rejectUnauthenticated: false,
            extractPolicies: () => ['read_profile'],
          }),
        ],
        schema,
      );
      const response = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            me {
              username
              email
              credit_card
            }
          }
        `),
      );
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        data: {
          me: {
            username: 'john.doe',
            email: 'john@doe.com',
            credit_card: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
              http: {
                status: 401,
              },
            },
            path: ['me', 'credit_card'],
            locations: [
              {
                line: 6,
                column: 15,
              },
            ],
          },
        ],
      });
    });
  });
});
