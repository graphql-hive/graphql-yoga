import { fetch } from '@whatwg-node/fetch';
import { startApp } from '../src/app.js';

describe('hapi example integration', () => {
  let port: number;
  function findAvailablePort() {
    return new Promise<number>((resolve, reject) => {
      const server = require('http').createServer();
      server.listen(0, () => {
        const { port } = server.address();
        server.close(() => resolve(port));
      });
      server.once('error', reject);
    });
  }
  let stop: VoidFunction;
  beforeAll(async () => {
    port = await findAvailablePort();
    stop = await startApp(port);
  });
  afterAll(() => stop());

  it('should execute query', async () => {
    const res = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ hello }' }),
    });

    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "hello": "world",
        },
      }
    `);
  });

  it('should execute mutation', async () => {
    const res = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: 'mutation { dontChange }' }),
    });

    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "dontChange": "didntChange",
        },
      }
    `);
  });

  it('should subscribe and stream', async () => {
    const res = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: 'subscription { greetings }' }),
    });

    await expect(res.text()).resolves.toMatchInlineSnapshot(`
":

event: next
data: {"data":{"greetings":"Hi"}}

event: next
data: {"data":{"greetings":"Bonjour"}}

event: next
data: {"data":{"greetings":"Hola"}}

event: next
data: {"data":{"greetings":"Ciao"}}

event: next
data: {"data":{"greetings":"Zdravo"}}

event: complete
data:

"
`);
  });

  it('should render graphiql page', async () => {
    const res = await fetch(`http://localhost:${port}/graphql`, {
      method: 'GET',
      headers: {
        accept: 'text/html',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
  });
});
