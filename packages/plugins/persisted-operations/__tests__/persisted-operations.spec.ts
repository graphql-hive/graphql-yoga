import { DocumentNode, parse, validate } from 'graphql';
import { createSchema, createYoga, GraphQLParams } from 'graphql-yoga';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      _: String
      print(str: String): String
    }
  `,
});

describe('Persisted Operations', () => {
  it('returns not found error for missing persisted query', async () => {
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation() {
            return null;
          },
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
    expect(body.errors[0].message).toBe('PersistedQueryNotFound');
  });

  it('uses a persisted query from the store', async () => {
    const store = new Map<string, string>();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
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

  it('rejects non-persisted operations', async () => {
    const store = new Map<string, string>();

    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
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
    expect(body.errors[0].message).toBe('PersistedQueryOnly');
  });

  it('allows non-persisted operations via allowArbitraryOperations flag', async () => {
    const store = new Map<string, string>();

    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          allowArbitraryOperations: true,
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
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({ __typename: 'Query' });
  });

  it('allows non-persisted operations via allowArbitraryOperations based on a header', async () => {
    const store = new Map<string, string>();

    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          allowArbitraryOperations: request => request.headers.get('foo') === 'bar',
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
        foo: 'bar',
      },
      body: JSON.stringify({
        query: '{__typename}',
      }),
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({ __typename: 'Query' });
  });

  it('should respect the custom getPersistedQueryKey implementation (Relay)', async () => {
    const store = new Map<string, string>();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          extractPersistedOperationId(params: GraphQLParams & { doc_id?: unknown }) {
            return typeof params.doc_id === 'string' ? params.doc_id : null;
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(persistedOperationKey, '{__typename}');
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        doc_id: persistedOperationKey,
      }),
    });

    const body = await response.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('should allow ASTs to be persisted', async () => {
    const store = new Map<string, DocumentNode>();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(
      persistedOperationKey,
      parse(/* GraphQL */ `
        {
          __typename
        }
      `),
    );
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: persistedOperationKey,
          },
        },
      }),
    });

    const body = await response.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('should skip parse if the operation type is an AST', async () => {
    const store = new Map<string, DocumentNode>();
    const parseFn = jest.fn();
    const yoga = createYoga({
      plugins: [
        {
          onParse({ setParseFn }: { setParseFn: (parseFn: typeof parse) => void }) {
            setParseFn(parseFn);
          },
        },
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(
      persistedOperationKey,
      parse(/* GraphQL */ `
        {
          __typename
        }
      `),
    );
    await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: persistedOperationKey,
          },
        },
      }),
    });

    expect(parseFn).not.toHaveBeenCalled();
  });

  it('should pass the default parameters of GraphQL Request', async () => {
    const store = new Map<string, DocumentNode>();
    const onParams = jest.fn();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
        }),
        {
          onParams,
        },
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(
      persistedOperationKey,
      parse(/* GraphQL */ `
        query Test($str: String) {
          print(str: $str)
        }
      `),
    );
    await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'Test',
        variables: {
          str: 'Foo',
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: persistedOperationKey,
          },
        },
      }),
    });

    expect(onParams).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          operationName: 'Test',
          query: '__PERSISTED_OPERATION_my-persisted-operation__',
          extensions: {
            persistedQuery: { version: 1, sha256Hash: persistedOperationKey },
          },
          variables: { str: 'Foo' },
        }),
      }),
    );
  });

  it('should skip validation with `skipDocumentValidation: true`', async () => {
    const store = new Map<string, string>();
    const validateFn = jest.fn();
    const yoga = createYoga({
      plugins: [
        {
          onValidate({
            setValidationFn,
          }: {
            setValidationFn(validationFn: typeof validate): void;
          }) {
            setValidationFn(validateFn);
          },
        },
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          skipDocumentValidation: true,
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(persistedOperationKey, '{__typename}');

    await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: persistedOperationKey,
          },
        },
      }),
    });

    expect(validateFn).not.toHaveBeenCalled();
  });

  it('uses a persisted query from the store based on request header', async () => {
    const store = new Map<string, string>();
    const clientOneStore = new Map<string, string>();

    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string, request: Request) {
            if (request.headers.get('client-name') === 'ClientOne') {
              return clientOneStore.get(key) || null;
            }

            return store.get(key) || null;
          },
        }),
      ],
      schema,
    });

    const persistedQueryEntry = {
      version: 1,
      sha256Hash: 'ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38',
    };

    clientOneStore.set(persistedQueryEntry.sha256Hash, '{__typename}');

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'client-name': 'ClientOne',
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

  it('extract key from request query parameter', async () => {
    const store = new Map<string, string>();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          extractPersistedOperationId(_params, request) {
            const url = new URL(request.url);
            return url.searchParams.get('id');
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(persistedOperationKey, '{__typename}');
    const response = await yoga.fetch(`http://yoga/graphql?id=${persistedOperationKey}`);

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('extract key from request header', async () => {
    const store = new Map<string, string>();
    const yoga = createYoga({
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          extractPersistedOperationId(_params, request) {
            return request.headers.get('x-document-id');
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(persistedOperationKey, '{__typename}');
    const response = await yoga.fetch(`http://yoga/graphql`, {
      headers: {
        'x-document-id': persistedOperationKey,
      },
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });

  it('extract key from path', async () => {
    const store = new Map<string, string>();
    const yoga = createYoga({
      graphqlEndpoint: '/graphql/:document_id?',
      plugins: [
        usePersistedOperations({
          getPersistedOperation(key: string) {
            return store.get(key) || null;
          },
          extractPersistedOperationId(_params, request) {
            return request.url.split('/graphql/').pop() ?? null;
          },
        }),
      ],
      schema,
    });
    const persistedOperationKey = 'my-persisted-operation';
    store.set(persistedOperationKey, '{__typename}');
    const response = await yoga.fetch(`http://yoga/graphql/${persistedOperationKey}`);

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__typename).toBe('Query');
  });
});
