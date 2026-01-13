import { Plugin } from '@graphql-yoga/types';
import { createSchema } from '../schema';
import { createYoga } from '../server';
import { useAllowedResponseHeaders } from './allowed-headers';

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
    return yoga.fetch('http://yoga/graphql', {
      body: JSON.stringify({ query: '{ __typename }' }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...requestHeaders,
      },
    });
  }
});
