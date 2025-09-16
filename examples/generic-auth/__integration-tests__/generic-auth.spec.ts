import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { fetch } from '@whatwg-node/fetch';
import { yoga } from '../src/app';

describe('graphql-auth example integration', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('should execute public field', async () => {
    const response = await fetch(`http://localhost:${port}/graphql?query=query{public}`);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      public: 'Hi',
    });
  });

  it('should throw error on executing auth required field', async () => {
    const response = await fetch(`http://localhost:${port}/graphql?query=query{requiresAuth}`);
    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toBe('Unauthorized field or type');
    expect(body.errors[0].path).toEqual(['requiresAuth']);
  });

  it('should execute on auth required field', async () => {
    const response = await fetch(`http://localhost:${port}/graphql?query=query{requiresAuth}`, {
      headers: {
        'x-authorization': 'aaa',
      },
    });
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      requiresAuth: 'hi foo@foo.com',
    });
  });

  it('should execute on public field with subscription', async () => {
    expect.assertions(1);
    const response = await fetch(`http://localhost:${port}/graphql?query=subscription{public}`, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    for await (const chunk of response.body!) {
      const chunkString = Buffer.from(chunk).toString('utf-8');
      if (chunkString.includes('data:')) {
        expect(chunkString.trim()).toContain('data: {"data":{"public":"hi"}}');
        break;
      }
    }
  });

  it('should execute on auth required field with subscription', async () => {
    expect.assertions(1);
    const response = await fetch(
      `http://localhost:${port}/graphql?query=subscription{requiresAuth}`,
      {
        headers: {
          Accept: 'text/event-stream',
          'x-authorization': 'aaa',
        },
      },
    );
    await expect(response.text()).resolves.toMatchInlineSnapshot(`
":

event: next
data: {"data":{"requiresAuth":"hi foo@foo.com"}}

event: complete
data:

"
`);
  });

  it('should not execute on auth required field with subscription', async () => {
    const response = await fetch(
      `http://localhost:${port}/graphql?query=subscription{requiresAuth}`,
      {
        headers: {
          Accept: 'text/event-stream',
        },
      },
    );
    await expect(response.text()).resolves.toMatchInlineSnapshot(`
":

event: next
data: {"data":null,"errors":[{"message":"Unauthorized field or type","locations":[{"line":1,"column":14}],"path":["requiresAuth"],"extensions":{"code":"UNAUTHORIZED_FIELD_OR_TYPE"}}]}

event: complete
data:

"
`);
  });
});
