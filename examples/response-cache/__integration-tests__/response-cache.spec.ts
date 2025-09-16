import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { fetch } from '@whatwg-node/fetch';
import { create } from '../src/main.js';

describe('example-response-cache', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('cache stuff', async () => {
    jest.useFakeTimers();

    const [port, close] = await create();
    try {
      let response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('etag')).toMatchInlineSnapshot(
        `"7490da5629533a4fc101a2188569a79b776d6a3d75920287e6fa9b203f2e8d34"`,
      );
      const lastModified = response.headers.get('last-modified');
      expect(lastModified).toBeDefined();

      jest.advanceTimersByTime(1000);

      response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('etag')).toMatchInlineSnapshot(
        `"7490da5629533a4fc101a2188569a79b776d6a3d75920287e6fa9b203f2e8d34"`,
      );
      const newLastModified = response.headers.get('last-modified');
      expect(lastModified).toEqual(newLastModified);
    } finally {
      await close();
    }
  });

  test('cache with TTL expires', async () => {
    const [port, close] = await create({
      ttlPerType: {
        User: 1100,
      },
    });
    try {
      let response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('etag')).toMatchInlineSnapshot(
        `"7490da5629533a4fc101a2188569a79b776d6a3d75920287e6fa9b203f2e8d34"`,
      );
      const lastModified = new Date(response.headers.get('last-modified')!).getTime();

      await setTimeout$(1000);

      response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('etag')).toMatchInlineSnapshot(
        `"7490da5629533a4fc101a2188569a79b776d6a3d75920287e6fa9b203f2e8d34"`,
      );

      let diff = new Date(response.headers.get('last-modified')!).getTime() - lastModified;
      expect(diff).toEqual(0);

      await setTimeout$(1000);

      response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('etag')).toMatchInlineSnapshot(
        `"7490da5629533a4fc101a2188569a79b776d6a3d75920287e6fa9b203f2e8d34"`,
      );
      diff = new Date(response.headers.get('last-modified')!).getTime() - lastModified;

      // diff should be 1000 because we forwarded by 1000ms and the cache only caches for 500ms
      expect(diff).toEqual(2000);
    } finally {
      await close();
    }
  });

  test('cache with ETag and If-None-Match', async () => {
    const [port, close] = await create({
      ttlPerType: {
        User: 500,
      },
    });
    try {
      let response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(200);
      const etag = response.headers.get('etag');

      response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'if-none-match': etag!,
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              me {
                id
              }
            }
          `,
        }),
      });

      expect(response.status).toEqual(304);
      expect(await response.text()).toEqual('');
    } finally {
      await close();
    }
  });
});
