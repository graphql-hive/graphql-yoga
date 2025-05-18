import { Client, createClient } from 'graphql-ws';
import ws from 'ws';
import { crypto, fetch } from '@whatwg-node/fetch';

describe('uWebSockets', () => {
  let uws: typeof import('uWebSockets.js');
  try {
    uws = require('uWebSockets.js');
  } catch (e) {
    it.skip('uWebSockets.js is not installed', () => {});
    return;
  }
  const { app } = require('../src/app');
  let port: number;
  let client: Client;
  beforeAll(async () => {
    port = await new Promise((resolve, reject) => {
      app.listen(0, listenSocket => {
        if (listenSocket) {
          resolve(uws.us_socket_local_port(listenSocket));
          return;
        }
        reject('Failed to start the server');
      });
    });
    client = createClient({
      url: `ws://localhost:${port}/graphql`,
      webSocketImpl: ws,
      generateID: () => crypto.randomUUID(),
    });
  });
  afterAll(async () => {
    app.close();
    await client.dispose();
  });
  it('should show GraphiQL', async () => {
    const response = await fetch(`http://localhost:${port}/graphql`, {
      headers: {
        accept: 'text/html',
      },
    });
    const body = await response.text();
    expect(body).toContain('Yoga GraphiQL');
  });
  it('should handle queries', async () => {
    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          {
            hello
          }
        `,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
    const body = await response.json();
    expect(body).toMatchObject({
      data: {
        hello: 'Hello world!',
      },
    });
  });
  it('should handle websockets', async () => {
    const result = await new Promise((resolve, reject) => {
      client.subscribe(
        {
          query: /* GraphQL */ `
            subscription {
              time
            }
          `,
        },
        {
          next: data => {
            resolve(data);
          },
          error: err => {
            reject(err);
          },
          complete: () => {
            reject('complete');
          },
        },
      );
    });
    expect(result).toMatchObject({
      data: {
        time: expect.any(String),
      },
    });
  });
});
