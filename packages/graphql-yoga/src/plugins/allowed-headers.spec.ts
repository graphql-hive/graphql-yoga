import { createSchema } from '../schema';
import { createYoga } from '../server';
import { useAllowedResponseHeaders } from './allowed-headers';
import type { Plugin } from './types';

describe('useAllowedHeaders', () => {
  it('should strip headers from responses', async () => {
    const response = await query({
      plugins: [
        useAllowedResponseHeaders(['content-type', 'content-length', 'x-allowed-custom-header']),
      ],
      responseHeaders: {
        'x-allowed-custom-header': 'value',
        // Verify that we can strip 2 headers in a row
        'x-disallowed-custom-header-1': 'value',
        'x-disallowed-custom-header-2': 'value',
      },
    });

    expect(response.headers.get('x-allowed-custom-header')).toEqual('value');
    expect(response.headers.get('x-disallowed-custom-header-1')).toBeNull();
    expect(response.headers.get('x-disallowed-custom-header-2')).toBeNull();
  });

  // A native `Headers` iterator is live: deleting an entry while iterating skips the next one.
  // `yoga.fetch(url, init)` builds the `Request` with whatwg-node's `Headers`, which does not
  // do that, so a native `Request` is what exercises this.
  describe('with a native `Request`', () => {
    const names = ['x-a', 'x-b', 'x-c', 'x-d'];

    async function fetchWithAdjacentUnlistedHeaders() {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              header(name: String!): String
            }
          `,
          resolvers: {
            Query: {
              header: (_root, { name }: { name: string }, { request }: { request: Request }) =>
                request.headers.get(name),
            },
          },
        }),
        allowedHeaders: {
          request: ['accept', 'content-type'],
          response: ['content-type', 'content-length'],
        },
        plugins: [
          {
            onResponse({ response }) {
              for (const name of names) {
                response.headers.set(name, '1');
              }
            },
          },
        ],
        landingPage: false,
      });

      const request = new globalThis.Request('http://localhost/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...Object.fromEntries(names.map(name => [name, '1'])),
        },
        body: JSON.stringify({
          query: `{ ${names.map(name => `${name.replace('-', '_')}: header(name: "${name}")`).join(' ')} }`,
        }),
      });
      return yoga.fetch(request);
    }

    it('strips every unlisted request header', async () => {
      const response = await fetchWithAdjacentUnlistedHeaders();

      expect((await response.json()).data).toEqual({
        x_a: null,
        x_b: null,
        x_c: null,
        x_d: null,
      });
    });

    it('strips every unlisted response header', async () => {
      const response = await fetchWithAdjacentUnlistedHeaders();

      expect(names.filter(name => response.headers.has(name))).toEqual([]);
    });
  });

  it('strips headers added by a user plugin and by CORS when configured via `allowedHeaders.response`', async () => {
    const yoga = createYoga({
      schema,
      allowedHeaders: { response: ['content-type'] },
      cors: { origin: 'https://example.com' },
      plugins: [
        {
          onResponse({ response }) {
            response.headers.set('x-debug', 'value');
          },
        },
      ],
    });

    const response = await yoga.fetch('/graphql', {
      body: JSON.stringify({ query: '{ __typename }' }),
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://example.com' },
    });

    // The allow-list option filters headers added by the server's own built-in plugins (like
    // CORS) and by user plugins (`options.plugins`) alike, not just headers already present
    // before either runs.
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('x-debug')).toBeNull();
    expect(response.headers.get('content-type')).toEqual(expect.any(String));
  });

  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        _: String
      }
    `,
  });

  function query({
    responseHeaders = {},
    requestHeaders = {},
    plugins = [],
  }: {
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    plugins?: Plugin[];
  } = {}) {
    const yoga = createYoga({
      schema,
      plugins: [
        {
          onResponse: ({ response }) => {
            for (const [header, value] of Object.entries(responseHeaders)) {
              response.headers.set(header, value);
            }
          },
        },
        ...plugins,
      ],
    });
    return yoga.fetch('/graphql', {
      body: JSON.stringify({ query: '{ __typename }' }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...requestHeaders,
      },
    });
  }
});
