// eslint-disable-next-line no-restricted-imports
import * as GraphQLJS from 'graphql';
import { useEngine, useExtendContext } from '@envelop/core';
import {
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import type { Plugin } from '@envelop/types';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { useErrorHandler } from '../../src/plugins/use-error-handler.js';
import { schema } from '../common.js';

describe('useErrorHandler', () => {
  it('should invoke error handler when error happens during execution', async () => {
    const testError = new Error('Foobar');

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw testError;
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { foo }`, {}, { foo: 'bar' });

    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({ phase: 'execution' }));
  });

  it('should invoke error handler when error happens during parse', async () => {
    expect.assertions(2);
    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { me `, {});
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'parse',
      }),
    );
  });

  it('should invoke error handler on validation error', async () => {
    expect.assertions(2);
    const useMyFailingValidator: Plugin = {
      onValidate(payload) {
        payload.setValidationFn(() => {
          return [createGraphQLError('Failure!')];
        });
      },
    };
    const mockHandler = jest.fn();
    const testInstance = createTestkit(
      [useMyFailingValidator, useErrorHandler(mockHandler)],
      schema,
    );
    await testInstance.execute(`query { iDoNotExistsMyGuy }`, {});
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'validate',
      }),
    );
  });

  it('should invoke error handle for context errors', async () => {
    expect.assertions(2);
    const mockHandler = jest.fn();
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useErrorHandler(mockHandler),
      ],
      schema,
    );

    try {
      await testInstance.execute(`query { me { name } }`);
    } catch {
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'context',
        }),
      );
      expect(mockHandler).toHaveBeenCalledTimes(1);
    }
  });

  it('should invoke error handler when error happens during subscription resolver call', async () => {
    const testError = new Error('Foobar');

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: String
        }
        type Subscription {
          foo: String
        }
      `,
      resolvers: {
        Subscription: {
          foo: {
            subscribe: () =>
              new Repeater(async (push, end) => {
                await push(1);
                end();
              }),
            resolve: () => {
              throw new Error('Foobar');
            },
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    const result = await testInstance.execute(`subscription { foo }`, {}, { foo: 'bar' });
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([testError]),
        phase: 'execution',
      }),
    );
  });

  it('should invoke error handler when error happens during incremental execution', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @defer on FRAGMENT_SPREAD | INLINE_FRAGMENT

        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw new Error('kaboom');
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit(
      [
        useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
        useErrorHandler(mockHandler),
      ],
      schema,
    );
    const result = await testInstance.execute(`query { ... @defer { foo } }`);
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);

    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({ phase: 'execution' }));
  });

  it('should invoke error handler with the latest merged context when error originates from a context extension (sync)', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: Boolean
        }
      `,
      resolvers: {
        Query: {
          _: () => true,
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit(
      [
        useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
        useErrorHandler(mockHandler),
        useExtendContext(() => ({ extension1: 'extension1' })),
        // @ts-expect-error - we know it
        useExtendContext(() => {
          throw new Error('Stop');
        }),
      ],
      schema,
    );

    try {
      testInstance.execute(/* GraphQL */ `
        query {
          _
        }
      `);
    } catch (err) {
      if (err instanceof Error === false || err.message !== 'Stop') {
        throw err;
      }
    }

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'context',
        context: expect.objectContaining({ extension1: 'extension1' }),
      }),
    );
  });
});

it('should invoke error handler with the latest merged context when error originates from a context extension (async)', async () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        _: Boolean
      }
    `,
    resolvers: {
      Query: {
        _: () => true,
      },
    },
  });

  const mockHandler = jest.fn();
  const testInstance = createTestkit(
    [
      useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
      useErrorHandler(mockHandler),
      useExtendContext(() => ({ extension1: 'extension1' })),
      // @ts-expect-error - we know it
      useExtendContext(async () => {
        throw new Error('Stop');
      }),
    ],
    schema,
  );

  try {
    await testInstance.execute(/* GraphQL */ `
      query {
        _
      }
    `);
  } catch (err) {
    if (err instanceof Error === false || err.message !== 'Stop') {
      throw err;
    }
  }

  expect(mockHandler).toHaveBeenCalledWith(
    expect.objectContaining({
      phase: 'context',
      context: expect.objectContaining({ extension1: 'extension1' }),
    }),
  );
});
