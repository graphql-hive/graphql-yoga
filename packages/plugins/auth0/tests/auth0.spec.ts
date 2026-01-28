import type { GraphQLError } from 'graphql';
import { useMaskedErrors } from '@envelop/core';
import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError } from '@graphql-tools/utils';
import { useAuth0 } from '../src';

describe('auth0', () => {
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

  it('Should not mask auth0 header errors', async () => {
    expect.assertions(8);
    const auto0Options = {
      domain: 'domain.com',
      audience: 'audience',
      headerName: 'authorization',
      preventUnauthenticatedAccess: false,
      extendContextField: 'auth0',
      tokenType: 'Bearer',
    };
    const testInstance = createTestkit([useMaskedErrors(), useAuth0(auto0Options)], schema);
    try {
      await testInstance.execute(
        `query { secret }`,
        {},
        { request: { headers: { authorization: 'Something' } } },
      );
    } catch (err) {
      const error = err as GraphQLError;
      expect(error?.name).toBe('GraphQLError');
      expect(error?.message).toBe('Unexpected error.');
      expect(error?.extensions).toBeUndefined();
      expect(error?.originalError).toBeUndefined();
    }

    try {
      await testInstance.execute(
        `query { secret }`,
        {},
        { request: { headers: { authorization: 'Something else' } } },
      );
    } catch (err) {
      const error = err as GraphQLError;
      expect(error?.name).toBe('GraphQLError');
      expect(error?.message).toBe('Unexpected error.');
      expect(error?.extensions).toBeUndefined();
      expect(error?.originalError).toBeUndefined();
    }
  });
});
