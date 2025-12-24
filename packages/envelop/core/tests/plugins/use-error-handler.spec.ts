import * as GraphQLJS from 'graphql';
import { useEngine, useExtendContext } from '@envelop/core';
import {
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { Plugin } from '@envelop/types';
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
              throw testError;
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

    expect(mockHandler.mock.calls).toHaveLength(1);
    expect(mockHandler.mock.calls[0][0].phase).toBe('execution');
    expect(mockHandler.mock.calls[0][0].errors).toHaveLength(1);
    expect(mockHandler.mock.calls[0][0].errors[0].name).toBe('GraphQLError');
    expect(mockHandler.mock.calls[0][0].errors[0].originalError).toBe(testError);
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
});
