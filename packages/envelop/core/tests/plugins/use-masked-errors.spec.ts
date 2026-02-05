import { GraphQLError } from 'graphql';
import {
  createDefaultMaskError,
  DEFAULT_ERROR_MESSAGE,
  MaskError,
  useExtendContext,
  useMaskedErrors,
} from '@envelop/core';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError } from '@graphql-tools/utils';

describe('useMaskedErrors', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        secret: String!
        secretEnvelop: String!
        secretWithExtensions: String!
      }
      type Subscription {
        instantError: String
        streamError: String
        streamResolveError: String
        instantGraphQLError: String
        streamGraphQLError: String
        streamResolveGraphQLError: String
      }
    `,
    resolvers: {
      Query: {
        secret: () => {
          throw new Error('Secret sauce that should not leak.');
        },
        secretEnvelop: () => {
          throw createGraphQLError('This message goes to all the clients out there!', {
            extensions: { foo: 1 },
          });
        },
        secretWithExtensions: () => {
          throw createGraphQLError('This message goes to all the clients out there!', {
            extensions: {
              code: 'Foo',
              message: 'Bar',
            },
          });
        },
      },
      Subscription: {
        instantError: {
          subscribe: async function () {
            throw new Error('Noop');
          },
          resolve: _ => _,
        },
        streamError: {
          subscribe: async function* () {
            throw new Error('Noop');
          },
          resolve: _ => _,
        },
        streamResolveError: {
          subscribe: async function* () {
            yield '1';
          },
          resolve: _ => {
            throw new Error('Noop');
          },
        },
        instantGraphQLError: {
          subscribe: async function () {
            throw createGraphQLError('Noop');
          },
          resolve: _ => _,
        },
        streamGraphQLError: {
          subscribe: async function* () {
            throw createGraphQLError('Noop');
          },
          resolve: _ => _,
        },
        streamResolveGraphQLError: {
          subscribe: async function* () {
            yield '1';
          },
          resolve: _ => {
            throw createGraphQLError('Noop');
          },
        },
      },
    },
  });

  it('Should mask non GraphQLErrors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secret }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error!.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should not mask expected errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secretEnvelop }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error!.message).toEqual('This message goes to all the clients out there!');
    expect(error!.extensions).toEqual({ foo: 1 });
  });

  it('Should not mask GraphQL operation syntax errors (of course it does not since we are only hooking in after execute, but just to be sure)', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { idonotexist }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error!.message).toEqual('Cannot query field "idonotexist" on type "Query".');
  });

  it('Should forward extensions from GraphQLError to final GraphQLError in errors array', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secretWithExtensions }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error!.extensions).toEqual({
      code: 'Foo',
      message: 'Bar',
    });
    expect(JSON.stringify(result)).toMatchInlineSnapshot(
      `"{"errors":[{"message":"This message goes to all the clients out there!","locations":[{"line":1,"column":9}],"path":["secretWithExtensions"],"extensions":{"code":"Foo","message":"Bar"}}],"data":null}"`,
    );
  });

  it('Should properly mask context creation errors with a custom error message', async () => {
    expect.assertions(4);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useMaskedErrors({ errorMessage: 'My Custom Error Message.' }),
      ],
      schema,
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err) {
      const error = err as GraphQLError;
      expect(error?.name).toBe('GraphQLError');
      expect(error?.message).toBe('My Custom Error Message.');
      expect(error?.extensions).toBeUndefined();
      expect(error?.originalError).toBeUndefined();
    }
  });
  it('Should properly mask context creation errors', async () => {
    expect.assertions(1);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useMaskedErrors(),
      ],
      schema,
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err: any) {
      expect(err.message).toEqual(DEFAULT_ERROR_MESSAGE);
    }
  });

  it('Should not mask expected context creation errors', async () => {
    expect.assertions(2);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw createGraphQLError('No context for you!', { extensions: { foo: 1 } });
        }),
        useMaskedErrors(),
      ],
      schema,
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err) {
      if (err instanceof GraphQLError) {
        expect(err.message).toEqual(`No context for you!`);
        expect(err.extensions).toEqual({ foo: 1 });
      } else {
        throw err;
      }
    }
  });

  it('Should mask subscribe (sync/promise) subscription errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`subscription { instantError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error!.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should mask subscribe (sync/promise) subscription errors with a custom error message', async () => {
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'My Custom subscription error message.' })],
      schema,
    );
    const result = await testInstance.execute(`subscription { instantError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    const error = result.errors?.[0];
    expect(error?.name).toBe('GraphQLError');
    expect(error?.message).toBe('My Custom subscription error message.');
    expect(error?.extensions).toBeUndefined();
    expect(error?.originalError).toBeUndefined();
  });

  it('Should not mask subscribe (sync/promise) subscription GraphQL errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`subscription { instantGraphQLError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toMatchInlineSnapshot(`
      [
        [GraphQLError: Noop],
      ]
    `);
  });

  it('Should mask subscribe (AsyncIterable) subscription errors', async () => {
    expect.assertions(1);
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err: any) {
      expect(err.message).toEqual(DEFAULT_ERROR_MESSAGE);
    }
  });

  it('Should mask subscribe (AsyncIterable) subscription errors with a custom error message', async () => {
    expect.assertions(4);
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'My AsyncIterable Custom Error Message.' })],
      schema,
    );
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err) {
      const error = err as GraphQLError;
      expect(error?.name).toBe('GraphQLError');
      expect(error?.message).toBe('My AsyncIterable Custom Error Message.');
      expect(error?.extensions).toBeUndefined();
      expect(error?.originalError).toBeUndefined();
    }
  });

  it('Should not mask subscribe (AsyncIterable) subscription envelop errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamGraphQLError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: Noop]`);
    }
  });

  it('Should mask resolve subscription errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamResolveError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(result!.errors).toBeDefined();
    expect(result!.errors).toHaveLength(1);
    const [error] = result!.errors!;
    expect(error!.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should mask resolve subscription errors with a custom error message', async () => {
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'Custom resolve subscription errors.' })],
      schema,
    );
    const resultStream = await testInstance.execute(`subscription { streamResolveError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(JSON.stringify(result)).toMatchInlineSnapshot(
      `"{"errors":[{"message":"Custom resolve subscription errors."}],"data":{"streamResolveError":null}}"`,
    );
  });

  it('Should not mask resolve subscription envelop errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamResolveGraphQLError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(result!.errors).toBeDefined();
    expect(result!.errors).toMatchInlineSnapshot(`
      [
        [GraphQLError: Noop],
      ]
    `);
  });

  it('should not mask parse errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { a `, {});
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      {
        "errors": [
          [GraphQLError: Syntax Error: Expected Name, found <EOF>.],
        ],
      }
    `);
  });

  it('should not mask validation errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { iDoNotExistsMyGuy }`, {});
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      {
        "errors": [
          [GraphQLError: Cannot query field "iDoNotExistsMyGuy" on type "Query".],
        ],
      }
    `);
  });

  it('should use custom error mask function for execution errors', async () => {
    const customErrorMaskFn: MaskError = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    const testInstance = createTestkit([useMaskedErrors({ maskError: customErrorMaskFn })], schema);
    const result = await testInstance.execute(`query { secret }`);
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      {
        "data": null,
        "errors": [
          [GraphQLError: Custom error message for Secret sauce that should not leak.

      GraphQL request:1:9
      1 | query { secret }
        |         ^],
        ],
      }
    `);
    expect(JSON.stringify(result)).toMatchInlineSnapshot(
      `"{"errors":[{"message":"Custom error message for Secret sauce that should not leak.\\n\\nGraphQL request:1:9\\n1 | query { secret }\\n  |         ^","extensions":{"custom":true}}],"data":null}"`,
    );
  });

  it('should use custom error mask function for subscribe (AsyncIterable) subscription errors', async () => {
    const customErrorMaskFn: MaskError = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    expect.assertions(2);
    const testInstance = createTestkit([useMaskedErrors({ maskError: customErrorMaskFn })], schema);
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err: any) {
      expect(err.message).toEqual('Custom error message for Error: Noop');
      expect(err.extensions.custom).toBe(true);
    }
  });

  it('should use custom error mask function for errors while building the context', async () => {
    const customErrorMaskFn: MaskError = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    const testInstance = createTestkit(
      [
        useMaskedErrors({ maskError: customErrorMaskFn }),
        useExtendContext((): {} => {
          throw createGraphQLError('Custom error');
        }),
      ],
      schema,
    );
    try {
      await testInstance.execute(`query { secret }`, {}, {});
    } catch (e) {
      expect((e as GraphQLError).message).toEqual('Custom error message for Custom error');
    }
    expect.assertions(1);
  });

  it('should include the original error message stack in the extensions in development mode', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw new Error("I'm a teapot");
          },
        },
      },
    });
    const testInstance = createTestkit(
      [useMaskedErrors({ maskError: createDefaultMaskError(true) })],
      schema,
    );
    const result = await testInstance.execute(`query { foo }`, {}, {});
    assertSingleExecutionValue(result);
    expect(result?.errors?.[0]?.extensions).toEqual({
      message: "I'm a teapot",
      stack: expect.stringMatching(/^Error: I'm a teapot/),
    });
  });

  it('should include the original thrown thing in the extensions in development mode', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw "I'm a teapot";
          },
        },
      },
    });
    const testInstance = createTestkit(
      [useMaskedErrors({ maskError: createDefaultMaskError(true) })],
      schema,
    );
    const result = await testInstance.execute(`query { foo }`, {}, {});
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.extensions).toEqual({
      message: 'Unexpected error value: "I\'m a teapot"',
      stack: expect.stringMatching(/Unexpected error value: \"I'm a teapot/),
    });
  });

  it('mask schema implementation error', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String!
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            return null;
          },
        },
      },
    });
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { foo }`, {}, {});
    assertSingleExecutionValue(result);
    const error = result.errors?.[0];
    expect(error?.name).toBe('GraphQLError');
    expect(error?.message).toBe('Unexpected error.');
    expect(error?.extensions).toBeUndefined();
    expect(error?.originalError).toBeUndefined();
  });
});
