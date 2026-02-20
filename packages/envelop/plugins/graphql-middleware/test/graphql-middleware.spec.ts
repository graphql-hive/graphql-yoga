import { shield } from 'graphql-shield';
import { useResponseCache } from '@envelop/response-cache';
import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useGraphQLMiddleware } from '../src/index.js';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      foo: String
    }
  `,
});

const permissions = shield({});

describe('useGraphQlJit', () => {
  it('does not cause infinite loops', async () => {
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttl: 2000,
          includeExtensionMetadata: true,
        }),
        useGraphQLMiddleware([permissions]),
      ],
      schema,
    );

    await testkit.execute(`{ __typename}`);
  });
});
