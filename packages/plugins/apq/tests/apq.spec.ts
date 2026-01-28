import { createSchema, createYoga } from 'graphql-yoga';
import { createInMemoryAPQStore, useAPQ } from '@graphql-yoga/plugin-apq';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      _: String
    }
  `,
});

describe('Automatic Persisted Queries', () => {
  it('sends not found error to client if persisted query is missing', async () => {
    const store = createInMemoryAPQStore();
    const yoga = createYoga({
      plugins: [
        useAPQ({
          store,
        }),
      ],
      schema,
    });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
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

    expect(response.ok).toBe(false);
    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toBe('PersistedQueryNotFound');
  });
  it('uses a stored persisted query', async () => {
    const store = createInMemoryAPQStore();
    const yoga = createYoga({
      plugins: [
        useAPQ({
          store,
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
          persistedQuery: persistedQueryEntry,
        },
      }),
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });
  it('saves a persisted query', async () => {
    const store = createInMemoryAPQStore();
    const yoga = createYoga({
      plugins: [
        useAPQ({
          store,
        }),
      ],
      schema,
    });

    const persistedQueryEntry = {
      version: 1,
      sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
    };
    const query = `{__typename}`;

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        extensions: {
          persistedQuery: persistedQueryEntry,
        },
      }),
    });

    const entry = store.get(persistedQueryEntry.sha256Hash);
    expect(entry).toBe(query);

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });
  it('raises an error when the hash does not match the operation', async () => {
    const store = createInMemoryAPQStore();
    const yoga = createYoga({
      plugins: [
        useAPQ({
          store,
        }),
      ],
      schema,
    });
    const query = `{__typename}`;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'leoeoel',
          },
        },
      }),
    });

    expect(response.ok).toBe(false);
    expect(await response.json()).toEqual({
      errors: [
        { message: 'PersistedQueryMismatch', extensions: { code: 'PERSISTED_QUERY_MISMATCH' } },
      ],
    });
  });
  it('raises an error but use status code 200 when the hash does not match the operation and forceStatusCodeOk is true', async () => {
    const store = createInMemoryAPQStore();
    const yoga = createYoga({
      plugins: [
        useAPQ({
          store,
          responseConfig: {
            forceStatusCodeOk: true,
          },
        }),
      ],
      schema,
    });
    const query = `{__typename}`;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'leoeoel',
          },
        },
      }),
    });

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({
      errors: [
        { message: 'PersistedQueryMismatch', extensions: { code: 'PERSISTED_QUERY_MISMATCH' } },
      ],
    });
  });
});
