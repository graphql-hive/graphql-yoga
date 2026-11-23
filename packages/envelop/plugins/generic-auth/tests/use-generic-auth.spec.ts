import { getIntrospectionQuery, GraphQLError, print } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ResolveUserFn, ValidateUserFn } from '../src/index.js';
import { DIRECTIVE_SDL, SKIP_AUTH_DIRECTIVE_SDL, useGenericAuth } from '../src/index.js';

type UserType = {
  id: number;
  name: string;
};

describe('useGenericAuth', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
    `,
    resolvers: {
      Query: {
        test: (_root, _args, context) => context.currentUser?.name || '',
      },
    },
  });

  const validresolveUserFn: ResolveUserFn<UserType> = async _context => {
    return {
      id: 1,
      name: 'Dotan',
    };
  };

  const invalidresolveUserFn: ResolveUserFn<UserType> = async _context => {
    return null;
  };

  describe('protect-all', () => {
    const schemaWithDirective = makeExecutableSchema({
      typeDefs: [
        SKIP_AUTH_DIRECTIVE_SDL,
        /* GraphQL */ `
          type Query {
            test: String!
            public: String @skipAuth
          }
        `,
      ],
      resolvers: {
        Query: {
          test: (_root, _args, context) => context.currentUser?.name || '',
          public: (_root, _args, _context) => 'public',
        },
      },
    });

    it('handles introspection query operations', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(getIntrospectionQuery());
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
    });

    it('Should allow execution when user is authenticated correctly', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.test).toBe('Dotan');
    });

    it('Should prevent execution when user is not authenticated correctly', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      try {
        await testInstance.execute(`query { test }`);
      } catch (err) {
        expect(err).toMatchInlineSnapshot(`[GraphQLError: Unauthenticated!]`);
      }
    });

    it('Should inject currentUser into the context when the user is valid', async () => {
      const spyFn = jest.fn();
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'resolve-only',
            resolveUserFn: validresolveUserFn,
          }),
          {
            onExecute: spyFn,
          },
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(spyFn).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            contextValue: expect.objectContaining({
              currentUser: {
                id: 1,
                name: 'Dotan',
              },
            }),
          }),
        }),
      );
    });

    it('Should allow execution when user is authenticated correctly and directive is set', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.public).toBe('public');
    });

    it('Should allow execution for public field when user is not authenticated', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.public).toBe('public');
    });

    it('does not leak an interface-level @skipAuth onto fields the implementing type declares on its own', async () => {
      const schemaWithInterfaceSkipAuth = makeExecutableSchema({
        typeDefs: [
          SKIP_AUTH_DIRECTIVE_SDL,
          /* GraphQL */ `
            type Query {
              node: Node @skipAuth
            }

            interface Node @skipAuth {
              id: ID!
            }

            type PrivateThing implements Node {
              id: ID!
              secret: String
            }
          `,
        ],
        resolvers: {
          Node: {
            __resolveType: () => 'PrivateThing',
          },
          Query: {
            node: () => ({ id: '1', secret: 'TOP SECRET DATA' }),
          },
        },
      });

      // `rejectUnauthenticated` is only part of the `protect-granular` options type, but the
      // runtime honors it for `protect-all` too (it just gates `rejectOnErrors` on the
      // underlying extended-validation plugin). Going through a pre-typed variable, instead of a
      // fresh object literal, avoids the excess-property-check error for this test.
      const options = {
        mode: 'protect-all' as const,
        resolveUserFn: invalidresolveUserFn,
        rejectUnauthenticated: false,
      };
      const testInstance = createTestkit([useGenericAuth(options)], schemaWithInterfaceSkipAuth);

      const publicField = await testInstance.execute(`query { node { id } }`);
      assertSingleExecutionValue(publicField);
      expect(publicField.errors).toBeUndefined();
      expect(publicField.data?.node).toEqual({ id: '1' });

      const privateField = await testInstance.execute(
        `query { node { id ... on PrivateThing { secret } } }`,
      );
      assertSingleExecutionValue(privateField);
      expect(privateField.data?.node).toEqual({ id: '1', secret: null });
      expect(privateField.errors).toHaveLength(1);
      expect(privateField.errors?.[0]?.path).toEqual(['node', 'secret']);
      expect(privateField.errors?.[0]?.extensions?.['code']).toBe('UNAUTHORIZED_FIELD_OR_TYPE');
    });

    it("inherits a single implemented interface's @skipAuth the same way whether selected via the interface or via an inline fragment on the concrete type", async () => {
      const schemaWithInterfaceOnlySkipAuth = makeExecutableSchema({
        typeDefs: [
          SKIP_AUTH_DIRECTIVE_SDL,
          /* GraphQL */ `
            type Query {
              node: Node @skipAuth
            }

            interface Node {
              secret: String @skipAuth
            }

            type Thing implements Node {
              secret: String
            }
          `,
        ],
        resolvers: {
          Node: {
            __resolveType: () => 'Thing',
          },
          Query: {
            node: () => ({ secret: 'PUBLIC DATA' }),
          },
        },
      });

      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-all',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithInterfaceOnlySkipAuth,
      );

      const viaInterface = await testInstance.execute(`query { node { secret } }`);
      assertSingleExecutionValue(viaInterface);
      expect(viaInterface.errors).toBeUndefined();
      expect(viaInterface.data?.node).toEqual({ secret: 'PUBLIC DATA' });

      const viaInlineFragment = await testInstance.execute(
        `query { node { ... on Thing { secret } } }`,
      );
      assertSingleExecutionValue(viaInlineFragment);
      expect(viaInlineFragment.errors).toBeUndefined();
      expect(viaInlineFragment.data?.node).toEqual({ secret: 'PUBLIC DATA' });
    });

    it('checks the possible runtime types of fields selected through an interface', async () => {
      const schemaWithSiblingInterfaces = makeExecutableSchema({
        typeDefs: [
          SKIP_AUTH_DIRECTIVE_SDL,
          /* GraphQL */ `
            type Query {
              public: Public @skipAuth
              publicOnly: PublicOnly @skipAuth
            }

            interface Public {
              name: String @skipAuth
            }

            interface Private {
              name: String
            }

            type Thing implements Public & Private {
              name: String
            }

            type PublicOnly implements Public {
              name: String
            }
          `,
        ],
        resolvers: {
          Public: {
            __resolveType: (obj: { __typename: string }) => obj.__typename,
          },
          Private: {
            __resolveType: (obj: { __typename: string }) => obj.__typename,
          },
          Query: {
            public: () => ({ __typename: 'Thing', name: 'TOP SECRET DATA' }),
            publicOnly: () => ({ __typename: 'PublicOnly', name: 'PUBLIC DATA' }),
          },
        },
      });

      const testInstance = createTestkit(
        [useGenericAuth({ mode: 'protect-all', resolveUserFn: invalidresolveUserFn })],
        schemaWithSiblingInterfaces,
      );

      for (const query of [
        `query { public { name } }`,
        `query { public { ... on Private { name } } }`,
        `query { public { ...P } } fragment P on Private { name }`,
      ]) {
        const result = await testInstance.execute(query);
        assertSingleExecutionValue(result);
        expect(result.data).toBeNull();
        expect(result.errors?.[0]?.extensions?.['code']).toBe('UNAUTHORIZED_FIELD_OR_TYPE');
      }

      for (const query of [
        `query { publicOnly { name } }`,
        `query { publicOnly { ... on Public { name } } }`,
      ]) {
        const result = await testInstance.execute(query);
        assertSingleExecutionValue(result);
        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual({ publicOnly: { name: 'PUBLIC DATA' } });
      }
    });

    it('does not grant @skipAuth for a field unless every implemented interface that declares it agrees', async () => {
      const schemaWithConflictingInterfaces = makeExecutableSchema({
        typeDefs: [
          SKIP_AUTH_DIRECTIVE_SDL,
          /* GraphQL */ `
            type Query {
              both: Both @skipAuth
            }

            interface A {
              field: String
            }

            interface B {
              field: String @skipAuth
            }

            type Both implements A & B {
              field: String
            }
          `,
        ],
        resolvers: {
          Query: {
            both: () => ({ field: 'TOP SECRET DATA' }),
          },
        },
      });

      const options = {
        mode: 'protect-all' as const,
        resolveUserFn: invalidresolveUserFn,
        rejectUnauthenticated: false,
      };
      const testInstance = createTestkit(
        [useGenericAuth(options)],
        schemaWithConflictingInterfaces,
      );

      const result = await testInstance.execute(`query { both { field } }`);
      assertSingleExecutionValue(result);
      expect(result.data?.both).toEqual({ field: null });
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.path).toEqual(['both', 'field']);
      expect(result.errors?.[0]?.extensions?.['code']).toBe('UNAUTHORIZED_FIELD_OR_TYPE');
    });
  });

  describe('resolve-only', () => {
    it('Should passthrough execution when user is authenticated correctly', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'resolve-only',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schema,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.test).toBe('Dotan');
    });

    it('Should passthrough also when the user is not authenticated', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'resolve-only',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schema,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.test).toBe('');
    });

    it('Should inject currentUser into the context when the user is valid', async () => {
      const spyFn = jest.fn();
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'resolve-only',
            resolveUserFn: validresolveUserFn,
          }),
          {
            onExecute: spyFn,
          },
        ],
        schema,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(spyFn).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            contextValue: expect.objectContaining({
              currentUser: {
                id: 1,
                name: 'Dotan',
              },
            }),
          }),
        }),
      );
    });

    it('Should inject currentUser as null into the context when the user is not valid', async () => {
      const spyFn = jest.fn();
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'resolve-only',
            resolveUserFn: invalidresolveUserFn,
          }),
          {
            onExecute: spyFn,
          },
        ],
        schema,
      );

      const result = await testInstance.execute(`query { test }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(spyFn).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            contextValue: expect.objectContaining({
              currentUser: null,
            }),
          }),
        }),
      );
    });
  });

  describe('auth-directive', () => {
    const schemaWithDirective = makeExecutableSchema({
      typeDefs: [
        DIRECTIVE_SDL,
        /* GraphQL */ `
          type Query {
            protected: String @authenticated
            public: String
            person: Person
          }
          interface Person {
            name: String
          }
          type Admin implements Person @authenticated {
            name: String
            email: String
          }
        `,
      ],
      resolvers: {
        Query: {
          protected: (_root, _args, context) => context.currentUser.name,
          public: (_root, _args, _context) => 'public',
          person: (_root, _args, context) => ({
            name: 'John',
            email: context.currentUser?.email,
          }),
        },
        Person: {
          __resolveType() {
            // for the sake of tests, always admin
            return 'Admin';
          },
        },
      },
    });

    it('Should allow execution when user is authenticated correctly and directive is set', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { protected }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.protected).toBe('Dotan');
    });

    it('Should allow execution for public field when the user is authenticated ', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: validresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.public).toBe('public');
    });

    it('Should allow execution for public field when the user incorrectly authenticated', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public }`);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data?.public).toBe('public');
    });

    it('Should prevent field execution when user is not authenticated correctly', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { protected }`);
      assertSingleExecutionValue(result);
      expect(result.errors?.length).toBe(1);
      expect(result.errors?.[0]?.message).toBe(`Unauthorized field or type`);
      // rejecting the whole operation should still signal an http failure
      expect(result.errors?.[0]?.extensions['http']).toEqual({ status: 401 });
    });

    it('preserves custom validator HTTP statuses when rejection is disabled', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: validresolveUserFn,
            rejectUnauthenticated: false,
            validateUser(params) {
              if (params.fieldAuthArgs) {
                // explicit custom statuses should survive the default
                // partial-response behavior
                return new GraphQLError('Forbidden', {
                  path: params.path,
                  extensions: { http: { status: 403 } },
                });
              }
              return void 0;
            },
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public protected }`);
      assertSingleExecutionValue(result);
      expect(result.data).toEqual({ public: 'public', protected: null });
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.extensions['http']).toEqual({ status: 403 });
    });

    it('Should prevent field execution when user is not authenticated correctly but continue execution for public fields', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
            rejectUnauthenticated: false,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(`query { public protected }`);
      assertSingleExecutionValue(result);
      expect(result).toMatchObject({
        data: {
          public: 'public',
          protected: null,
        },
        errors: [
          {
            message: `Unauthorized field or type`,
            path: ['protected'],
          },
        ],
      });
    });

    it('Should prevent inline fragment of protected type execution when user is not authenticated correctly but continue execution for public fields inside the parent', async () => {
      let redactedQuery = '';
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
            rejectUnauthenticated: false,
          }),
          {
            onExecute({ args }) {
              redactedQuery = print(args.document).trim();
            },
          },
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(/* GraphQL */ `
        {
          public
          person {
            name
            ... on Admin {
              email
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toMatchObject({
        data: {
          public: 'public',
          person: {
            // the person is an @authenticated Admin at runtime
            name: null,
            email: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            path: ['person', 'name'],
          },
          {
            message: 'Unauthorized field or type',
            path: ['person', 'email'],
          },
        ],
      });

      expect(redactedQuery).toMatchInlineSnapshot(`
       "{
         public
         person {
           name
         }
       }"
      `);
    });

    it('Should prevent inline fragment of protected type execution when user is not authenticated correctly but continue execution for public fields outside the parent', async () => {
      let redactedQuery = '';
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
            rejectUnauthenticated: false,
          }),
          {
            onExecute({ args }) {
              redactedQuery = print(args.document).trim();
            },
          },
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(/* GraphQL */ `
        {
          public
          person {
            ... on Admin {
              email
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toMatchObject({
        data: {
          public: 'public',
          person: {
            email: null,
          },
        },
        errors: [
          {
            message: 'Unauthorized field or type',
            path: ['person', 'email'],
          },
        ],
      });

      expect(redactedQuery).toMatchInlineSnapshot(`
       "{
         public
       }"
      `);
    });

    it('Should prevent fragment definition of protected type execution when user is not authenticated correctly but continue execution for public fields outside the parent', async () => {
      let redactedQuery = '';
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
            rejectUnauthenticated: false,
          }),
          {
            onExecute({ args }) {
              redactedQuery = print(args.document).trim();
            },
          },
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(/* GraphQL */ `
        query {
          public
          person {
            ...A
          }
        }
        fragment A on Admin {
          email
        }
      `);
      assertSingleExecutionValue(result);
      expect(result.errors).toMatchObject([
        {
          message: 'Unauthorized field or type',
          path: ['person', 'email'],
        },
      ]);
      expect(result.data).toEqual({
        public: 'public',
        person: {
          email: null,
        },
      });

      expect(redactedQuery).toMatchInlineSnapshot(`
       "{
         public
       }"
      `);
    });

    describe('auth directive with role', () => {
      type UserTypeWithRole = UserType & { role: 'ADMIN' | 'USER' };
      const validateUserFn: ValidateUserFn<UserTypeWithRole> = params => {
        const schemaCoordinate = `${params.parentType.name}.${params.fieldNode.name.value}`;
        if (!params.user) {
          return new GraphQLError(`Accessing '${schemaCoordinate}' requires authentication.`, {
            nodes: [params.fieldNode],
          });
        }

        if (params.fieldAuthArgs && params.fieldAuthArgs['role'] !== params.user.role) {
          return new GraphQLError(
            `Missing permissions for accessing field '${schemaCoordinate}'. Requires role '${params.fieldAuthArgs['role']}'. Request is authenticated with role '${params.user.role}'.`,
            { nodes: [params.fieldNode] },
          );
        }

        return undefined;
      };

      const invalidRoleResolveUserFn: ResolveUserFn<UserTypeWithRole> = async _context => {
        return {
          id: 1,
          name: 'Dotan',
          role: 'USER',
        };
      };

      const validRoleResolveUserFn: ResolveUserFn<UserTypeWithRole> = async _context => {
        return {
          id: 1,
          name: 'Dotan',
          role: 'ADMIN',
        };
      };

      const schemaWithDirectiveWithRole = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          enum Role {
            ADMIN
            USER
          }

          directive @authenticated(role: Role! = USER) on FIELD_DEFINITION

          type Query {
            protected: String @authenticated
            admin: String @authenticated(role: ADMIN)
            public: String
          }
        `,
        resolvers: {
          Query: {
            protected: (_root, _args, context) => context.currentUser.name,
            public: (_root, _args, _context) => 'public',
            admin: (_root, _args, _context) => 'admin',
          },
        },
      });

      it('Should prevent field execution when user does not have right role', async () => {
        const testInstance = createTestkit(
          [
            useGenericAuth({
              mode: 'protect-granular',
              resolveUserFn: invalidRoleResolveUserFn,
              validateUser: validateUserFn,
            }),
          ],
          schemaWithDirectiveWithRole,
        );

        const result = await testInstance.execute(`query { admin }`);
        assertSingleExecutionValue(result);
        expect(result.errors?.length).toBe(1);
        expect(result.errors?.[0]?.message).toBe(
          `Missing permissions for accessing field 'Query.admin'. Requires role 'ADMIN'. Request is authenticated with role 'USER'.`,
        );
      });

      it('Should allow execution when user has right role', async () => {
        const testInstance = createTestkit(
          [
            useGenericAuth({
              mode: 'protect-granular',
              resolveUserFn: validRoleResolveUserFn,
              validateUser: validateUserFn,
            }),
          ],
          schemaWithDirectiveWithRole,
        );

        const result = await testInstance.execute(`query { admin }`);
        assertSingleExecutionValue(result);
        expect(result.errors).toBeUndefined();
        expect(result.data?.admin).toBe('admin');
      });

      describe('declared through interfaces', () => {
        const grantedRoles = { USER: ['USER'], ADMIN: ['USER', 'ADMIN'] };
        const seenRoles: string[] = [];
        const hierarchicalValidateUserFn: ValidateUserFn<UserTypeWithRole> = params => {
          seenRoles.push(params.fieldAuthArgs?.['role']);
          if (
            params.fieldAuthArgs &&
            !grantedRoles[params.user.role].includes(params.fieldAuthArgs['role'])
          ) {
            return new GraphQLError(`Requires role '${params.fieldAuthArgs['role']}'.`, {
              nodes: [params.fieldNode],
            });
          }
          return undefined;
        };

        const schemaWithInterfaceRoles = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            enum Role {
              ADMIN
              USER
            }

            directive @authenticated(role: Role! = USER) on FIELD_DEFINITION

            type Query {
              overriding: Overriding
              multi: Multi
              same: Same
            }

            interface AdminOnly {
              secret: String @authenticated(role: ADMIN)
            }

            interface UserOnly {
              secret: String @authenticated
            }

            type Overriding implements AdminOnly {
              secret: String @authenticated(role: USER)
            }

            type Multi implements UserOnly & AdminOnly {
              secret: String
            }

            type Same implements AdminOnly {
              secret: String @authenticated(role: ADMIN)
            }
          `,
          resolvers: {
            Query: {
              overriding: () => ({ secret: 'TOP SECRET DATA' }),
              multi: () => ({ secret: 'TOP SECRET DATA' }),
              same: () => ({ secret: 'TOP SECRET DATA' }),
            },
          },
        });

        const execute = (resolveUserFn: ResolveUserFn<UserTypeWithRole>, query: string) => {
          seenRoles.length = 0;
          const testInstance = createTestkit(
            [
              useGenericAuth({
                mode: 'protect-granular',
                resolveUserFn,
                validateUser: hierarchicalValidateUserFn,
              }),
            ],
            schemaWithInterfaceRoles,
          );
          return testInstance.execute(query);
        };

        it.each(['overriding', 'multi'])(
          'enforces every interface role declaration on %s',
          async field => {
            const denied = await execute(invalidRoleResolveUserFn, `query { ${field} { secret } }`);
            assertSingleExecutionValue(denied);
            expect(denied.data).toBeNull();
            expect(denied.errors?.[0]?.message).toBe(`Requires role 'ADMIN'.`);

            const allowed = await execute(validRoleResolveUserFn, `query { ${field} { secret } }`);
            assertSingleExecutionValue(allowed);
            expect(allowed.errors).toBeUndefined();
            expect(allowed.data).toEqual({ [field]: { secret: 'TOP SECRET DATA' } });
            expect(seenRoles.filter(Boolean).sort()).toEqual(['ADMIN', 'USER']);
          },
        );

        it('validates identical declarations only once', async () => {
          const result = await execute(validRoleResolveUserFn, `query { same { secret } }`);
          assertSingleExecutionValue(result);
          expect(result.errors).toBeUndefined();
          expect(seenRoles.filter(Boolean)).toEqual(['ADMIN']);
        });
      });
    });

    it('should not validate fields with @include and @skip directives', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(
        /* GraphQL */ `
          query ($skip: Boolean!, $include: Boolean!) {
            public
            p1: protected @skip(if: $skip)
            p2: protected @skip(if: true)
            p3: protected @include(if: false)
            p4: protected @include(if: $include)
          }
        `,
        { skip: true, include: false },
      );
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        public: 'public',
      });
    });
    it('should not validate fields with @include and @skip directives with default values', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(/* GraphQL */ `
        query ($skip: Boolean! = true, $include: Boolean! = false) {
          public
          p1: protected @skip(if: $skip)
          p2: protected @skip(if: true)
          p3: protected @include(if: false)
          p4: protected @include(if: $include)
        }
      `);
      assertSingleExecutionValue(result);
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        public: 'public',
      });
    });

    it('should fail closed when variable coercion fails instead of auth-checking skipped fields', async () => {
      const testInstance = createTestkit(
        [
          useGenericAuth({
            mode: 'protect-granular',
            resolveUserFn: invalidresolveUserFn,
          }),
        ],
        schemaWithDirective,
      );

      const result = await testInstance.execute(
        /* GraphQL */ `
          query ($skip: Boolean!) {
            public
            protected @skip(if: $skip)
          }
        `,
        // wrong type -> getVariableValues errors; must not emit UNAUTHORIZED for `protected`
        { skip: 'nope' },
      );
      assertSingleExecutionValue(result);
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(
        result.errors?.some(error => error.extensions?.['code'] === 'UNAUTHORIZED_FIELD_OR_TYPE'),
      ).toBe(false);
    });
  });
});
