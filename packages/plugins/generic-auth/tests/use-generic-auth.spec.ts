import { getIntrospectionQuery, print } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError } from '@graphql-tools/utils';
import {
  DIRECTIVE_SDL,
  ResolveUserFn,
  SKIP_AUTH_DIRECTIVE_SDL,
  useGenericAuth,
  ValidateUserFn,
} from '../src/index.js';

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

  const validresolveUserFn: ResolveUserFn<UserType> = async () => {
    return {
      id: 1,
      name: 'Dotan',
    };
  };

  const invalidresolveUserFn: ResolveUserFn<UserType> = async () => {
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
          public: () => 'public',
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
          public: () => 'public',
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
      expect(result.errors?.[0]!.message).toBe(`Unauthorized field or type`);
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
            name: 'John',
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
          return createGraphQLError(`Accessing '${schemaCoordinate}' requires authentication.`, {
            nodes: [params.fieldNode],
          });
        }

        if (params.fieldAuthArgs) {
          if (params.fieldAuthArgs['role'] !== params.user.role) {
            return createGraphQLError(
              `Missing permissions for accessing field '${schemaCoordinate}'. Requires role '${params.fieldAuthArgs['role']}'. Request is authenticated with role '${params.user.role}'.`,
              { nodes: [params.fieldNode] },
            );
          }
        }

        return undefined;
      };

      const invalidRoleResolveUserFn: ResolveUserFn<UserTypeWithRole> = async () => {
        return {
          id: 1,
          name: 'Dotan',
          role: 'USER',
        };
      };

      const validRoleResolveUserFn: ResolveUserFn<UserTypeWithRole> = async () => {
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
            public: () => 'public',
            admin: () => 'admin',
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
        expect(result.errors?.[0]!.message).toBe(
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
  });
});
