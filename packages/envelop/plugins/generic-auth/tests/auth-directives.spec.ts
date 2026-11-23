import type { DocumentNode, ExecutionResult } from 'graphql';
import { buildASTSchema, execute, parse, subscribe } from 'graphql';
import { envelop, useEngine, useSchema, type Plugin } from '@envelop/core';
import { useExtendContextValuePerExecuteSubscriptionEvent } from '@envelop/execute-subscription-event';
import { useGenericAuth } from '@envelop/generic-auth';
import { createTestkit } from '@envelop/testing';
import { addResolversToSchema, makeExecutableSchema } from '@graphql-tools/schema';

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
    it('returns partial data without an HTTP status override when a field scope is missing', async () => {
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
      // partial field denials shouldn't force the http server to reject the response.
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
    it('requires scopes from every implemented interface, not just the first one found', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          ${authDirectives}
          type Query {
            both: Both
          }

          interface A {
            secret: String @requiresScopes(scopes: [["scopeA"]])
          }

          interface B {
            secret: String @requiresScopes(scopes: [["scopeB"]])
          }

          type Both implements A & B {
            secret: String
          }
        `,
        resolvers: {
          Query: {
            both: () => ({ secret: 'TOP SECRET DATA' }),
          },
        },
      });

      const execute = (scope: string[]) => {
        const testkit = createTestkit(
          [
            useGenericAuth({
              mode: 'protect-granular',
              resolveUserFn: () => ({ scope }),
              rejectUnauthenticated: false,
            }),
          ],
          schema,
        );
        return testkit.execute(
          parse(/* GraphQL */ `
            query {
              both {
                secret
              }
            }
          `),
        );
      };

      const onlyScopeA = await execute(['scopeA']);
      expect(JSON.parse(JSON.stringify(onlyScopeA)).data.both.secret).toBeNull();

      const onlyScopeB = await execute(['scopeB']);
      expect(JSON.parse(JSON.stringify(onlyScopeB)).data.both.secret).toBeNull();

      const bothScopes = await execute(['scopeA', 'scopeB']);
      expect(JSON.parse(JSON.stringify(bothScopes)).data.both.secret).toBe('TOP SECRET DATA');
    });
    it('requires scopes from an interface implemented transitively through another interface', async () => {
      // The SDL omits `Base` from `Concrete`'s `implements` list, which `graphql-js` would
      // normally reject (a type must redeclare every interface its own interfaces implement).
      // Schemas composed by gateways/federation tooling can carry this gap without ever running
      // that check, e.g. when built with `assumeValid`, so `Concrete.getInterfaces()` returning
      // only `Mid` must still not let the scope on `Base` be bypassed.
      const schema = addResolversToSchema({
        schema: buildASTSchema(
          parse(/* GraphQL */ `
            ${authDirectives}
            type Query {
              node: Concrete
            }

            interface Base {
              secret: String @requiresScopes(scopes: [["admin"]])
            }

            interface Mid implements Base {
              secret: String
            }

            type Concrete implements Mid {
              secret: String
            }
          `),
          { assumeValid: true },
        ),
        resolvers: {
          Query: {
            node: () => ({ secret: 'TOP SECRET DATA' }),
          },
        },
      });

      const execute = (scope: string[]) => {
        const testkit = createTestkit(
          [
            useGenericAuth({
              mode: 'protect-granular',
              resolveUserFn: () => ({ scope }),
              rejectUnauthenticated: false,
            }),
          ],
          schema,
        );
        return testkit.execute(
          parse(/* GraphQL */ `
            query {
              node {
                secret
              }
            }
          `),
        );
      };

      const noScope = await execute([]);
      expect(JSON.parse(JSON.stringify(noScope)).data.node.secret).toBeNull();

      const withScope = await execute(['admin']);
      expect(JSON.parse(JSON.stringify(withScope)).data.node.secret).toBe('TOP SECRET DATA');
    });
    it('treats an empty scopes list as a permanent lockout, not "no requirement"', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          ${authDirectives}
          type Query {
            locked: Locked
          }

          type Locked @requiresScopes(scopes: []) {
            data: String
          }
        `,
        resolvers: {
          Query: {
            locked: () => ({ data: 'should never be visible' }),
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: () => ({ scope: ['anything'] }),
            rejectUnauthenticated: false,
          }),
        ],
        schema,
      );

      const result = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            locked {
              data
            }
          }
        `),
      );
      expect(JSON.parse(JSON.stringify(result)).data.locked.data).toBeNull();
      expect(JSON.parse(JSON.stringify(result)).errors).toHaveLength(1);
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
      // every post resolves to the @authenticated PrivateBlog, so its fields are denied on the
      // actual objects even when selected through the Post interface, and the non-null denial
      // bubbles up per regular graphql null propagation
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        data: null,
        errors: [
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
            },
            locations: [
              {
                column: 15,
                line: 4,
              },
            ],
            path: ['posts', 0, 'id'],
          },
          {
            message: 'Unauthorized field or type',
            extensions: {
              code: 'UNAUTHORIZED_FIELD_OR_TYPE',
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

      const authenticated = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            posts {
              id
              ... on PrivateBlog {
                allowedViewers {
                  username
                }
              }
            }
          }
        `),
        {},
        { auth: {} },
      );
      expect(JSON.parse(JSON.stringify(authenticated))).toEqual({
        data: {
          posts: [
            { id: '1', allowedViewers: [{ username: 'john.doe' }, { username: 'jane.doe' }] },
            { id: '2', allowedViewers: [{ username: 'jane.doe' }] },
          ],
        },
      });
    });
    it('does not allow bypassing an interface field directive via an inline fragment on the implementing type', async () => {
      const schema = makeExecutableSchema({
        typeDefs: parse(/* GraphQL */ `
          ${authDirectives}
          type Query {
            node: Node
          }

          interface Node {
            id: ID!
            secret: String @requiresScopes(scopes: [["admin"]])
          }

          type PublicThing implements Node {
            id: ID!
            secret: String
          }
        `),
        resolvers: {
          Node: {
            __resolveType: () => 'PublicThing',
          },
          Query: {
            node: () => ({ id: '1', secret: 'TOP SECRET DATA' }),
          },
        },
      });
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: () => null,
            rejectUnauthenticated: false,
          }),
        ],
        schema,
      );

      const viaInterface = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            node {
              id
              secret
            }
          }
        `),
      );
      expect(JSON.parse(JSON.stringify(viaInterface)).data.node.secret).toBeNull();

      const viaInlineFragment = await testkit.execute(
        parse(/* GraphQL */ `
          query {
            node {
              id
              ... on PublicThing {
                secret
              }
            }
          }
        `),
      );
      expect(JSON.parse(JSON.stringify(viaInlineFragment)).data.node.secret).toBeNull();
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
  describe('empty requirement lists', () => {
    it.each([
      { directive: 'requiresScopes', arg: 'scopes', interfaceList: '[]', concreteList: '[["a"]]' },
      { directive: 'requiresScopes', arg: 'scopes', interfaceList: '[["a"]]', concreteList: '[]' },
      { directive: 'requiresScopes', arg: 'scopes', interfaceList: null, concreteList: '[]' },
      { directive: 'policy', arg: 'policies', interfaceList: '[]', concreteList: '[["a"]]' },
      { directive: 'policy', arg: 'policies', interfaceList: '[["a"]]', concreteList: '[]' },
      { directive: 'policy', arg: 'policies', interfaceList: null, concreteList: '[]' },
    ])(
      'denies @$directive when interface declares $interfaceList and concrete type declares $concreteList',
      async ({ directive, arg, interfaceList, concreteList }) => {
        const schema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            ${authDirectives}
            type Query {
              node: Node
            }

            interface Node {
              secret: String ${interfaceList ? `@${directive}(${arg}: ${interfaceList})` : ''}
            }

            type Thing implements Node {
              secret: String @${directive}(${arg}: ${concreteList})
            }
          `,
          resolvers: {
            Node: { __resolveType: () => 'Thing' },
            Query: { node: () => ({ secret: 'TOP SECRET DATA' }) },
          },
        });
        const testkit = createTestkit(
          [
            useGenericAuth({
              mode: 'protect-granular',
              resolveUserFn: () => ({ scope: ['a'] }),
              extractPolicies: () => ['a'],
              rejectUnauthenticated: false,
            }),
          ],
          schema,
        );

        for (const query of [
          '{ node { secret } }',
          '{ node { ... on Thing { secret } } }',
          '{ node { ...F } } fragment F on Thing { secret }',
        ]) {
          const result = JSON.parse(JSON.stringify(await testkit.execute(parse(query))));
          expect(result.data.node.secret).toBeNull();
          expect(result.errors).toHaveLength(1);
        }
      },
    );
  });
  describe('selections on abstract types', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        ${authDirectives}
        type Query {
          node: Restricted
          other: Other
          view: View
        }

        interface Restricted {
          secret: String @authenticated
        }

        interface View {
          secret: String
        }

        type Thing implements Restricted & View {
          secret: String
        }

        type Other implements View {
          secret: String
        }

        type Scoped implements View {
          secret: String @requiresScopes(scopes: [["admin"]]) @policy(policies: [["read"]])
        }
      `,
      resolvers: {
        View: { __resolveType: (obj: { __typename: string }) => obj.__typename },
        Restricted: { __resolveType: (obj: { __typename: string }) => obj.__typename },
        Query: {
          node: () => ({ __typename: 'Thing', secret: 'TOP SECRET DATA' }),
          other: () => ({ __typename: 'Other', secret: 'PUBLIC DATA' }),
          view: () => ({ __typename: 'Scoped', secret: 'TOP SECRET DATA' }),
        },
      },
    });
    const execute = async (
      query: string,
      {
        rejectUnauthenticated,
        user = null,
        policies = [],
      }: { rejectUnauthenticated: boolean; user?: { scope: string[] } | null; policies?: string[] },
    ) => {
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: () => user,
            extractPolicies: () => policies,
            rejectUnauthenticated,
          }),
        ],
        schema,
      );
      return JSON.parse(JSON.stringify(await testkit.execute(parse(query))));
    };

    const deniedQueries = [
      { query: '{ node { ... on View { secret } } }', path: ['node', 'secret'] },
      { query: '{ node { ... on View { s: secret } } }', path: ['node', 's'] },
      { query: '{ node { ...V } } fragment V on View { secret }', path: ['node', 'secret'] },
      {
        query: '{ node { ...V } } fragment V on View { ... on View { s: secret } }',
        path: ['node', 's'],
      },
      { query: '{ view { secret } }', path: ['view', 'secret'] },
      { query: '{ view { ...V } } fragment V on View { s: secret }', path: ['view', 's'] },
    ];

    it.each(deniedQueries)('denies $query without partial results', async ({ query }) => {
      const result = await execute(query, { rejectUnauthenticated: true });
      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].extensions.code).toBe('UNAUTHORIZED_FIELD_OR_TYPE');
    });

    it.each(deniedQueries)('denies $query with partial results', async ({ query, path }) => {
      const result = await execute(query, { rejectUnauthenticated: false });
      expect(result.data[path[0]!][path[1]!]).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toEqual(path);
    });

    it.each(deniedQueries)('allows $query when authorized', async ({ query, path }) => {
      const result = await execute(query, {
        rejectUnauthenticated: true,
        user: { scope: ['admin'] },
        policies: ['read'],
      });
      expect(result.errors).toBeUndefined();
      expect(result.data[path[0]!][path[1]!]).toBe('TOP SECRET DATA');
    });

    it('denies scoped concrete fields selected through the interface when missing a scope or policy', async () => {
      for (const auth of [
        { user: { scope: ['admin'] }, policies: [] },
        { user: { scope: [] }, policies: ['read'] },
      ]) {
        const result = await execute('{ view { secret } }', {
          rejectUnauthenticated: false,
          ...auth,
        });
        expect(result.data.view.secret).toBeNull();
        expect(result.errors).toHaveLength(1);
      }
    });

    it('does not deny types that cannot be selected at that position', async () => {
      for (const query of [
        '{ other { secret } }',
        '{ other { ... on View { secret } } }',
        '{ other { ...V } } fragment V on View { secret }',
      ]) {
        const result = await execute(query, { rejectUnauthenticated: true });
        expect(result).toEqual({ data: { other: { secret: 'PUBLIC DATA' } } });
      }
    });
  });
  describe('actual runtime types of the same abstract type', () => {
    const things: Record<string, { __typename: string; id: string; secret: string }> = {
      '1': { __typename: 'PublicThing', id: '1', secret: 'PUBLIC DATA' },
      '2': { __typename: 'RestrictedThing', id: '2', secret: 'TOP SECRET DATA' },
      '3': { __typename: 'ScopedThing', id: '3', secret: 'TOP SECRET DATA' },
    };
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        ${authDirectives}
        type Query {
          view(id: ID!): View
          views: [View!]!
        }

        type Subscription {
          view: View
        }

        interface View {
          id: ID!
          secret: String
        }

        type PublicThing implements View {
          id: ID!
          secret: String
        }

        type RestrictedThing implements View {
          id: ID!
          secret: String @authenticated
        }

        type ScopedThing implements View {
          id: ID!
          secret: String @requiresScopes(scopes: [["admin"]])
        }
      `,
      resolvers: {
        View: { __resolveType: (obj: { __typename: string }) => obj.__typename },
        Query: {
          view: async (_: unknown, { id }: { id: string }) => things[id],
          views: async () => Object.values(things),
        },
        Subscription: {
          view: {
            async *subscribe() {
              yield { view: things['1'] };
              yield { view: things['2'] };
              yield { view: things['1'] };
            },
          },
        },
        PublicThing: {
          // makes sure the original resolver still gets the context
          secret: async (obj: { secret: string }, _: unknown, context: { tenant: string }) =>
            `${obj.secret} (${context.tenant})`,
        },
      },
    });
    const createAuthTestkit = ({
      rejectUnauthenticated,
      user = null,
    }: {
      rejectUnauthenticated: boolean;
      user?: { scope: string[] } | null;
    }) =>
      createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: () => user,
            rejectUnauthenticated,
          }),
        ],
        schema,
      );
    const execute = async (query: string, options: Parameters<typeof createAuthTestkit>[0]) =>
      JSON.parse(
        JSON.stringify(
          await createAuthTestkit(options).execute(parse(query), {}, { tenant: 'acme' }),
        ),
      );
    const subscribe = async (options: Parameters<typeof createAuthTestkit>[0]) => {
      const result = await createAuthTestkit(options).execute(
        parse('subscription { view { ... on View { secret } } }'),
        {},
        { tenant: 'acme' },
      );
      const payloads = [];
      for await (const payload of result as AsyncIterable<unknown>) {
        payloads.push(JSON.parse(JSON.stringify(payload)));
      }
      return payloads;
    };
    const queries = (id: string) => [
      `{ view(id: "${id}") { secret } }`,
      `{ view(id: "${id}") { ... on View { secret } } }`,
      `{ view(id: "${id}") { ...V } } fragment V on View { secret }`,
    ];

    it.each(queries('1'))('allows %s when the actual object is public', async query => {
      for (const rejectUnauthenticated of [true, false]) {
        expect(await execute(query, { rejectUnauthenticated })).toEqual({
          data: { view: { secret: 'PUBLIC DATA (acme)' } },
        });
      }
    });

    it.each([...queries('2'), ...queries('3')])(
      'rejects %s when the actual object is restricted',
      async query => {
        const result = await execute(query, { rejectUnauthenticated: true });
        expect(result.data).toBeNull();
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].path).toEqual(['view', 'secret']);
        expect(result.errors[0].extensions).toEqual({
          code: 'UNAUTHORIZED_FIELD_OR_TYPE',
          http: { status: 401 },
        });
      },
    );

    it.each([...queries('2'), ...queries('3')])(
      'denies %s with partial results when the actual object is restricted',
      async query => {
        const result = await execute(query, { rejectUnauthenticated: false });
        expect(result.data).toEqual({ view: { secret: null } });
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].path).toEqual(['view', 'secret']);
        expect(result.errors[0].extensions).toEqual({ code: 'UNAUTHORIZED_FIELD_OR_TYPE' });
      },
    );

    it('denies only the restricted objects of a mixed list with partial results', async () => {
      const result = await execute('{ views { id secret } }', { rejectUnauthenticated: false });
      expect(result.data).toEqual({
        views: [
          { id: '1', secret: 'PUBLIC DATA (acme)' },
          { id: '2', secret: null },
          { id: '3', secret: null },
        ],
      });
      expect(result.errors.map((error: { path: unknown }) => error.path)).toEqual([
        ['views', 1, 'secret'],
        ['views', 2, 'secret'],
      ]);
    });

    it('rejects a mixed list containing restricted objects', async () => {
      const result = await execute('{ views { id ... on View { secret } } }', {
        rejectUnauthenticated: true,
      });
      expect(result.data).toBeNull();
      expect(result.errors.map((error: { path: unknown }) => error.path)).toEqual([
        ['views', 1, 'secret'],
        ['views', 2, 'secret'],
      ]);
    });

    it('denies a restricted object that requires a scope the user lacks', async () => {
      const result = await execute('{ views { id secret } }', {
        rejectUnauthenticated: false,
        user: { scope: [] },
      });
      expect(result.data.views).toEqual([
        { id: '1', secret: 'PUBLIC DATA (acme)' },
        { id: '2', secret: 'TOP SECRET DATA' },
        { id: '3', secret: null },
      ]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toEqual(['views', 2, 'secret']);
    });

    it('allows every object when authorized', async () => {
      expect(
        await execute('{ views { id secret } }', {
          rejectUnauthenticated: true,
          user: { scope: ['admin'] },
        }),
      ).toEqual({
        data: {
          views: [
            { id: '1', secret: 'PUBLIC DATA (acme)' },
            { id: '2', secret: 'TOP SECRET DATA' },
            { id: '3', secret: 'TOP SECRET DATA' },
          ],
        },
      });
    });

    it('rejects only the subscription events whose actual object is restricted', async () => {
      const publicEvent = { data: { view: { secret: 'PUBLIC DATA (acme)' } } };
      const rejected = await subscribe({ rejectUnauthenticated: true });
      expect(rejected).toHaveLength(3);
      expect(rejected[0]).toEqual(publicEvent);
      expect(rejected[1].data).toBeNull();
      expect(rejected[1].errors[0].path).toEqual(['view', 'secret']);
      expect(rejected[2]).toEqual(publicEvent);

      const partial = await subscribe({ rejectUnauthenticated: false });
      expect(partial).toHaveLength(3);
      expect(partial[0]).toEqual(publicEvent);
      expect(partial[1].data).toEqual({ view: { secret: null } });
      expect(partial[1].errors[0].path).toEqual(['view', 'secret']);
      expect(partial[2]).toEqual(publicEvent);
    });
  });
  describe('runtime checks of executions sharing a context', () => {
    const things: Record<string, { __typename: string; secret: string }> = {
      '1': { __typename: 'PublicThing', secret: 'PUBLIC DATA' },
      '2': { __typename: 'RestrictedThing', secret: 'TOP SECRET DATA' },
    };
    let gate = Promise.resolve();
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        ${authDirectives}
        type Query {
          view(id: ID!): View
          slowView(id: ID!): View
          public: String
        }

        type Subscription {
          views: View
        }

        interface View {
          secret: String
        }

        type PublicThing implements View {
          secret: String
        }

        type RestrictedThing implements View {
          secret: String @authenticated
        }
      `,
      resolvers: {
        View: { __resolveType: (obj: { __typename: string }) => obj.__typename },
        Query: {
          view: (_: unknown, { id }: { id: string }) => things[id],
          slowView: async (_: unknown, { id }: { id: string }) => {
            await gate;
            return things[id];
          },
          public: () => 'PUBLIC',
        },
        Subscription: {
          views: {
            async *subscribe() {
              yield { views: things['2'] };
              yield { views: things['1'] };
              yield { views: things['2'] };
            },
          },
        },
      },
    });
    const setup = async (plugins: Plugin[] = []) => {
      const enveloped = envelop({
        plugins: [
          useEngine({ execute, subscribe }),
          useSchema(schema),
          useGenericAuth({ mode: 'protect-granular', resolveUserFn: () => null }),
          ...plugins,
        ],
      })();
      // a single context shared by every operation, like a reused or connection-wide one
      const contextValue = await enveloped.contextFactory();
      return {
        execute: (document: DocumentNode, variableValues?: Record<string, unknown>) =>
          enveloped.execute({
            schema: enveloped.schema,
            document,
            variableValues,
            contextValue,
          }) as Promise<ExecutionResult>,
        subscribe: (document: DocumentNode) =>
          enveloped.subscribe({
            schema: enveloped.schema,
            document,
            contextValue,
          }) as Promise<AsyncIterable<ExecutionResult>>,
      };
    };
    const denied = (path: string[]) => ({
      data: null,
      errors: [expect.objectContaining({ message: 'Unauthorized field or type', path })],
    });

    it('keeps the runtime checks of each overlapping execution', async () => {
      const { execute } = await setup();
      let release!: () => void;
      gate = new Promise(resolve => (release = resolve));
      const document = parse(/* GraphQL */ `
        query ($id: ID!, $show: Boolean!) {
          slowView(id: $id) {
            secret @include(if: $show)
          }
        }
      `);
      const restricted = execute(document, { id: '2', show: true });
      expect(await execute(parse('{ view(id: "1") { secret } }'))).toEqual({
        data: { view: { secret: 'PUBLIC DATA' } },
      });
      const sameDocument = execute(document, { id: '2', show: false });
      expect(await execute(parse('{ public }'))).toEqual({ data: { public: 'PUBLIC' } });
      release();
      expect(await restricted).toEqual(denied(['slowView', 'secret']));
      expect(await sameDocument).toEqual({ data: { slowView: {} } });
    });

    it('keeps the runtime checks of a subscription while other operations execute', async () => {
      const { execute, subscribe } = await setup();
      const events = await subscribe(parse('subscription { views { secret } }'));
      const results = [];
      for await (const event of events) {
        results.push(event);
        expect(await execute(parse('{ public }'))).toEqual({ data: { public: 'PUBLIC' } });
      }
      expect(results).toEqual([
        denied(['views', 'secret']),
        { data: { views: { secret: 'PUBLIC DATA' } } },
        denied(['views', 'secret']),
      ]);
    });

    it('keeps the runtime checks of subscription events executed with another context', async () => {
      const { subscribe } = await setup([
        useExtendContextValuePerExecuteSubscriptionEvent(() => ({ contextPartial: {} })),
      ]);
      const results = [];
      for await (const event of await subscribe(parse('subscription { views { secret } }'))) {
        results.push(event);
      }
      expect(results).toEqual([
        denied(['views', 'secret']),
        { data: { views: { secret: 'PUBLIC DATA' } } },
        denied(['views', 'secret']),
      ]);
    });
  });
  describe('custom directives via interfaces', () => {
    it("exposes every implemented interface's declaration of a custom directive, not just the first", async () => {
      // `requiresScopes`/`authenticated`/`policy` are combined explicitly, but any other
      // directive is only surfaced to a custom `validateUser` through `fieldDirectives`, which
      // must not silently drop an interface's declaration just because another interface
      // declared the same directive name first.
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          directive @hasRole(role: String!) on FIELD_DEFINITION

          type Query {
            both: Both
          }

          interface A {
            secret: String @hasRole(role: "A")
          }

          interface B {
            secret: String @hasRole(role: "B")
          }

          type Both implements A & B {
            secret: String
          }
        `,
        resolvers: {
          Query: {
            both: () => ({ secret: 'TOP SECRET DATA' }),
          },
        },
      });

      const seenRoles: string[] = [];
      const testkit = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: () => ({}),
            rejectUnauthenticated: false,
            validateUser: params => {
              const hasRole = params.fieldDirectives?.['hasRole'] ?? [];
              seenRoles.push(...hasRole.map(args => args['role'] as string));
            },
          }),
        ],
        schema,
      );

      await testkit.execute(
        parse(/* GraphQL */ `
          query {
            both {
              secret
            }
          }
        `),
      );

      expect(seenRoles.sort()).toEqual(['A', 'B']);
    });
  });
});
