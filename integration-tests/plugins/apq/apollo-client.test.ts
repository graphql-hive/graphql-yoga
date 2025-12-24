/* eslint-disable import/no-extraneous-dependencies */
import crypto from 'node:crypto';
import { parse, version } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { useAPQ } from '@graphql-yoga/plugin-apq';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

describe('Automatic Persisted Queries', () => {
  if (version.startsWith('15')) {
    it('noop', () => {});
    return;
  }
  const server = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo() {
            return 'bar';
          },
        },
      },
    }),
    plugins: [useAPQ()],
  });

  const linkChain = createPersistedQueryLink({ sha256 }).concat(
    new HttpLink({ uri: 'http://localhost:4000/graphql', fetch: (...args) => fetchSpy(...args) }),
  );

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: linkChain,
  });

  let fetchSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.fn(async (info: RequestInfo | URL, init: RequestInit) =>
      server.fetch(info as URL, init),
    );
  });

  it('works', async () => {
    const query = '{\n  foo\n}';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: Fails with GraphQL v15
    const { data } = await client.query({ query: parse(query) });

    expect(data).toEqual({ foo: 'bar' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({
        variables: {},
        extensions: {
          clientLibrary: {
            name: '@apollo/client',
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            version: require('@apollo/client/package.json').version,
          },
          persistedQuery: {
            version: 1,
            sha256Hash: sha256(query),
          },
        },
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json,application/json;q=0.9',
      },
      method: 'POST',
    });
    expect(fetchSpy.mock.calls[1][1]).toMatchObject({
      body: JSON.stringify({
        variables: {},
        extensions: {
          clientLibrary: {
            name: '@apollo/client',
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            version: require('@apollo/client/package.json').version,
          },
          persistedQuery: {
            version: 1,
            sha256Hash: sha256(query),
          },
        },
        query,
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json,application/json;q=0.9',
      },
      method: 'POST',
    });
  });
});
