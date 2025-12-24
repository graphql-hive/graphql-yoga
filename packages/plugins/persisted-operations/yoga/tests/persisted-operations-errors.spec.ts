import { createGraphQLError, createSchema, createYoga } from 'graphql-yoga';
import {
  CustomPersistedQueryErrors,
  usePersistedOperations,
} from '@graphql-yoga/plugin-persisted-operations';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      _: String
    }
  `,
});

describe('Persisted Operations', () => {
  describe('Custom Errors', () => {
    it('should allow to customize not found error message with a string', async () => {
      const error = await generateNotFoundError({ notFound: 'Not found' });
      expect(error.message).toBe('Not found');
    });

    it('should allow to customize not found error message with error options', async () => {
      const error = await generateNotFoundError({
        notFound: {
          message: 'Not found',
          extensions: { code: 'NOT_FOUND' },
        },
      });
      expect(error.message).toBe('Not found');
      expect(error.extensions.code).toBe('NOT_FOUND');
    });

    it('should allow to customize not found error message with a function', async () => {
      const error = await generateNotFoundError({
        notFound: () =>
          createGraphQLError('Not found', {
            extensions: { code: 'NOT_FOUND' },
          }),
      });
      expect(error.message).toBe('Not found');
      expect(error.extensions.code).toBe('NOT_FOUND');
    });

    it('should allow to customize error when key is not found with a string', async () => {
      const error = await generateKeyNotFoundError({
        keyNotFound: 'Key not found',
      });
      expect(error.message).toBe('Key not found');
    });

    it('should allow to customize error when key is not found with error options', async () => {
      const error = await generateKeyNotFoundError({
        keyNotFound: {
          message: 'Key not found',
          extensions: { code: 'KEY_NOT_FOUND' },
        },
      });
      expect(error.message).toBe('Key not found');
      expect(error.extensions.code).toBe('KEY_NOT_FOUND');
    });

    it('should allow to customize error when key is not found with a function', async () => {
      const error = await generateKeyNotFoundError({
        keyNotFound: () =>
          createGraphQLError('Key not found', {
            extensions: { code: 'KEY_NOT_FOUND' },
          }),
      });
      expect(error.message).toBe('Key not found');
      expect(error.extensions.code).toBe('KEY_NOT_FOUND');
    });

    it('should allow to customize persisted query only error with a string', async () => {
      const error = await generatePersistedQueryOnlyError({
        persistedQueryOnly: 'Persisted query only',
      });
      expect(error.message).toBe('Persisted query only');
    });

    it('should allow to customize persisted query only error with error options', async () => {
      const error = await generatePersistedQueryOnlyError({
        persistedQueryOnly: {
          message: 'Persisted query only',
          extensions: { code: 'PERSISTED_ONLY' },
        },
      });
      expect(error.message).toBe('Persisted query only');
      expect(error.extensions.code).toBe('PERSISTED_ONLY');
    });

    it('should allow to customize persisted query only error with a function', async () => {
      const error = await generatePersistedQueryOnlyError({
        persistedQueryOnly: () =>
          createGraphQLError('Persisted query only', {
            extensions: { code: 'PERSISTED_ONLY' },
          }),
      });
      expect(error.message).toBe('Persisted query only');
      expect(error.extensions.code).toBe('PERSISTED_ONLY');
    });
  });
});

async function generateNotFoundError(customErrors: CustomPersistedQueryErrors) {
  const yoga = createYoga({
    plugins: [
      usePersistedOperations({
        getPersistedOperation() {
          return null;
        },
        customErrors,
      }),
    ],
    schema,
  });

  const response = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
        },
      },
    }),
  });

  const body = await response.json();
  expect(body.errors).toBeDefined();
  return body.errors[0];
}

async function generateKeyNotFoundError(customErrors: CustomPersistedQueryErrors) {
  const store = new Map<string, string>();

  const yoga = createYoga({
    plugins: [
      usePersistedOperations({
        getPersistedOperation(key) {
          return store.get(key) || null;
        },
        extractPersistedOperationId() {
          return null;
        },
        customErrors,
      }),
    ],
    schema,
  });

  const persistedQueryEntry = {
    version: 1,
    sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
  };
  store.set(persistedQueryEntry.sha256Hash, '{__typename}');

  const response = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
        },
      },
    }),
  });

  const body = await response.json();
  expect(body.errors).toBeDefined();
  return body.errors[0];
}

async function generatePersistedQueryOnlyError(customErrors: CustomPersistedQueryErrors) {
  const store = new Map<string, string>();

  const yoga = createYoga({
    plugins: [
      usePersistedOperations({
        getPersistedOperation(key: string) {
          return store.get(key) || null;
        },
        customErrors,
      }),
    ],
    schema,
  });
  const persistedQueryEntry = {
    version: 1,
    sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
  };
  store.set(persistedQueryEntry.sha256Hash, '{__typename}');

  const response = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: '{__typename}',
    }),
  });

  const body = await response.json();
  expect(body.errors).toBeDefined();
  return body.errors[0];
}
