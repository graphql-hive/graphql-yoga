import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { fetch } from '@whatwg-node/fetch';
import { yoga } from '../src/yoga';

describe('error-handling example integration', () => {
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

  it('should get a masked error', async () => {
    const response = await fetch(`http://localhost:${port}/graphql?query=query{greeting}`);
    const body = await response.json();

    expect(body).toMatchInlineSnapshot(`
{
  "data": null,
  "errors": [
    {
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
      },
      "locations": [
        {
          "column": 7,
          "line": 1,
        },
      ],
      "message": "Unexpected error.",
      "path": [
        "greeting",
      ],
    },
  ],
}
`);
  });

  it('should get a custom error', async () => {
    const response = await fetch(
      `http://localhost:${port}/graphql?query=query{user(byId: "6"){id}}`,
    );
    const body = await response.json();

    expect(body).toMatchInlineSnapshot(`
      {
        "data": null,
        "errors": [
          {
            "extensions": {
              "code": "USER_NOT_FOUND",
              "someRandomExtensions": {
                "aaaa": 3,
              },
            },
            "locations": [
              {
                "column": 7,
                "line": 1,
              },
            ],
            "message": "User with id '6' not found.",
            "path": [
              "user",
            ],
          },
        ],
      }
    `);
  });
});
