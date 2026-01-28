import { createHmac } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';
import { createClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga, Plugin } from 'graphql-yoga';
import jwt, { Algorithm, SignOptions } from 'jsonwebtoken';
import WebSocket, { WebSocketServer } from 'ws';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import { useCookies } from '@whatwg-node/server-plugin-cookies';
import { JwtPluginOptions } from '../config';
import { useJWT } from '../plugin';
import {
  createInlineSigningKeyProvider,
  createRemoteJwksSigningKeyProvider,
  extractFromConnectionParams,
  extractFromCookie,
  extractFromHeader,
} from '../utils';

const JWKS_RSA512_PRIVATE_PEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAjllePzkDl9e0O9Vuy1/qpSPUL8RQbuHOCQknWysfHlm6QGNq
iyDY46AMfpaSb45bMYQjgOoL7nboe8Q1Qaz4M33PyV+/cYm9lY2cdxE72Vd7LlLF
I+4q5uPbnX0ofb1kiD47I7KOKshbq2UzLnV6CDXBr5+LMZyXKOCNCEtvEytHwdXD
osveJ0BzBaEY6tdJdmitGaXrqHj365Rms14x8uU6uSXZm3ZQYB/j5oiGu+JoGIIP
GPyEQ4R0lThMCxXmmplcVUkfFrsth3WhQdzlRwXMPT1myvEA8Cro4nWTPKnL/W4e
1r4CT1NjMDYPbDU0zJhBei8FCeCAW8DSjd7fawIDAQABAoIBACk8eFHmSUUuZnbC
0HK32Xh3VZt0yjwky5PQhAckCcK4CX1nj1C4djwSfCwboFYSrhY9Ci/pHQW6ioR4
BVl+KvR3qL7ULthMJ5BwUngnlOfUMMntjlBnSSRTs6X+wMEUIVBafrVLn2WDXxLa
oSX/QBeqwu4GUMNRcnSUACb7+zRY7d7gn4xSHL4lbkQRZ+ZuWabjrmj1pDM7rGrZ
3qMfLVsTvBaqYMlX01clZtd8IcZxA04b1eTSwok1ut6kIvLc/+DXIM0+J7GdCU5h
DCMPk3hTIwjtj3U0ad4dGP2WiAYbR/L8Hozjvr50NgiSTB0ZEka5PfAmpu86QIq/
+GzDN7kCgYEA+GP8GrBL9R50yADVLZ/idrBnLmPnFLAYU469jUYnIUqbNRUP1yia
V0mnxrJS47H+uHClavIyapz6s8pBE8AHWgqjj41kihB3hmRk49/nsIbPG4fewXPw
KLxConzoqsOdZhHHF0UaJTgq9FMpi2okoLC3BfD1j2X5OVAn/wNeq08CgYEAkrW/
d7d7urLe/79ew46Ca9E/TZdkPIJIkFFfqxFO8+6tFtP9UEwmp0rOK9YCIv9Hs+24
6F+TnmCQd5u+VcUarMrD5jUQB4zNEqDiBenUbpYiZDl3uLTelHNMMUVeqX4PfDvG
gh1HosErQhkysayVyQK87/N5F0dN1DZ07b6i0yUCgYA/wMHzQ66rQl7s+rG8nR3u
IsbI9GFaQPxtbeSe/xOKCvEdRcOkEMrUfpYufJSj1oqvYlJCydlA3fvG67GaVR5N
8Q8cCEl22lUjTF9M0apQ97juswfslUpd2jwsIm1BbyXWDdgQ0+6rAOidfz7ZhqvS
BqljP/53CNBX8ofhf0bsJwKBgBerJKmeu2JiayGdcR9hhV75khnle7FbX3OQ/Tsu
/qrR7bDKIIrsziudIOfnjc6xmpLHnlY23Szm7Ueuo6VYuDX6PGKOWvis2YTQ2cYU
dEYnCINc1hjBbUtL0pX8WApGIR9s0Vi6eo0iVuVCBXCupDearnqTsAx2X3MGGhUk
9UXVAoGBAMDzIS2XjvzO1sIDbjbb4mIa6iQU5s/E9hV0H4sHq+yb8EWMBajwV1tZ
TQYHV7TjRUSrEkmcinVIXi/oQCGz9og/MHGGBD0Idoww5PqjB9jTcCIoAd8PTZCp
I3OrgFkoqk03cpX4AL2GYC2ejytAqboL6pFTfmTgg2UtvKIeaTyF
-----END RSA PRIVATE KEY-----
`;

describe('jwt plugin', () => {
  let server: Server | undefined;
  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server?.close(err => (err ? reject(err) : resolve()));
      });
    }
  });
  test('incoming http request is reject when auth token is not present', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider('topsecret')],
    });
    const response = await test.queryWithoutAuth();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "message": "Unauthenticated",
    },
  ],
}
`);
  });

  test('should allow to continue if reject.missingToken is set to false', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider('topsecret')],
      reject: {
        missingToken: false,
        invalidToken: true,
      },
    });
    const response = await test.queryWithoutAuth();
    expect(response.status).toBe(200);
  });

  test('any prefix is supported when strict prefix validation is not configured', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenLookupLocations: [
        extractFromHeader({
          name: 'Authorization',
        }),
      ],
    });
    const token = buildJWT({}, { issuer: 'test', key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
  });

  test('incoming http has a token but prefix does not match or missing', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider('topsecret')],
    });
    // does not match prefix
    let response = await test.queryWithAuth('Basic 123');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "message": "Invalid JWT authentication token prefix.",
    },
  ],
}
`);

    // missing token after prefix
    response = await test.queryWithAuth('Bearer');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "message": "Authentication header was set, but token is missing.",
    },
  ],
}
`);
  });

  test('token provided but jwt token is not valid for decoding', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider('topsecret')],
    });
    const response = await test.queryWithAuth('Bearer BadJwt');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "message": "Invalid authentication token provided",
    },
  ],
}
`);
  });

  test('invalid token can be accepted when reject.invalidToken=false is set', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider('topsecret')],
      reject: {
        invalidToken: false,
      },
    });
    const response = await test.queryWithAuth('Bearer BadJwt');
    expect(response.status).toBe(200);
  });

  it('should not allow non matching issuer', async () => {
    const secret = 'topsecret';
    const server = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenVerification: {
        issuer: ['http://yoga'],
      },
    });
    const response = await server.queryWithAuth(buildJWT({}, { issuer: 'test', key: secret }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'Unauthenticated',
        },
      ],
    });
  });

  it('should allow matching issuer', async () => {
    const secret = 'topsecret';
    const server = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenVerification: {
        issuer: ['http://yoga'],
      },
    });
    const response = await server.queryWithAuth(
      buildJWT({}, { issuer: 'http://yoga', key: secret }),
    );
    expect(response.status).toBe(200);
  });

  it('should not allow non matching audience', async () => {
    const secret = 'topsecret';
    const server = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenVerification: {
        audience: 'my.app',
      },
    });
    const response = await server.queryWithAuth(
      buildJWT({}, { audience: 'my.other.app', key: secret }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'Unauthenticated',
        },
      ],
    });
  });

  it('should allow matching audience', async () => {
    const secret = 'topsecret';
    const server = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenVerification: {
        audience: 'my.app',
      },
    });
    const response = await server.queryWithAuth(buildJWT({}, { audience: 'my.app', key: secret }));
    expect(response.status).toBe(200);
  });

  it('should not allow unknown key id when remote jwks is used', async () => {
    const jwksServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(
        JSON.stringify({
          keys: [
            {
              kty: 'RSA',
              e: 'AQAB',
              use: 'sig',
              kid: 'test_id',
              alg: 'RS512',
              n: 'jllePzkDl9e0O9Vuy1_qpSPUL8RQbuHOCQknWysfHlm6QGNqiyDY46AMfpaSb45bMYQjgOoL7nboe8Q1Qaz4M33PyV-_cYm9lY2cdxE72Vd7LlLFI-4q5uPbnX0ofb1kiD47I7KOKshbq2UzLnV6CDXBr5-LMZyXKOCNCEtvEytHwdXDosveJ0BzBaEY6tdJdmitGaXrqHj365Rms14x8uU6uSXZm3ZQYB_j5oiGu-JoGIIPGPyEQ4R0lThMCxXmmplcVUkfFrsth3WhQdzlRwXMPT1myvEA8Cro4nWTPKnL_W4e1r4CT1NjMDYPbDU0zJhBei8FCeCAW8DSjd7faw',
            },
          ],
        }),
      );
      res.end();
    }).listen();

    try {
      const server = createTestServer({
        signingKeyProviders: [
          createRemoteJwksSigningKeyProvider({
            jwksUri: `http://localhost:${(jwksServer.address() as any).port}`,
          }),
        ],
      });
      const response = await server.queryWithAuth(
        buildJWT({}, { keyid: 'unknown', key: JWKS_RSA512_PRIVATE_PEM, algorithm: 'RS256' }),
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({
        errors: [
          {
            message: 'Unexpected error.',
          },
        ],
      });
    } finally {
      jwksServer.close();
    }
  });

  it('should not accept token without algorithm', async () => {
    const secret = 'topsecret';
    const server = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
    });

    const response = await server.queryWithAuth(buildJWTWithoutAlg());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'Invalid authentication token provided',
        },
      ],
    });
  });

  test('valid token is injected to the GraphQL context', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
    });
    const token = buildJWT({ sub: '123', scopes: ['users.read'] }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        ctx: {
          jwt: {
            payload: {
              sub: '123',
              scopes: ['users.read'],
            },
            token: {
              prefix: 'Bearer',
              value: expect.any(String),
            },
          },
        },
      },
    });
  });

  test('valid token is injected to the GraphQL context (custom field)', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      extendContext: 'my_jwt',
    });
    const token = buildJWT({ sub: '123', scopes: ['users.read'] }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        ctx: {
          my_jwt: {
            payload: {
              sub: '123',
              scopes: ['users.read'],
            },
            token: {
              prefix: 'Bearer',
              value: expect.any(String),
            },
          },
        },
      },
    });
  });

  test('auth is passing when token is valid (HS256)', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
    });
    const token = buildJWT({ sub: '123' }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        ctx: {
          jwt: {
            payload: {
              sub: '123',
            },
            token: {
              prefix: 'Bearer',
              value: expect.any(String),
            },
          },
        },
      },
    });
  });

  test('should allow to use deprecated `singingKeyProviders` option', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      singingKeyProviders: [createInlineSigningKeyProvider(secret)],
    });
    const token = buildJWT({ sub: '123' }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        ctx: {
          jwt: {
            payload: {
              sub: '123',
            },
            token: {
              prefix: 'Bearer',
              value: expect.any(String),
            },
          },
        },
      },
    });
  });

  test('should not allow to use both deprecated `singingKeyProviders` option and its replacement', async () => {
    const secret = 'topsecret';
    try {
      // @ts-expect-error This should not be allowed by TS
      createTestServer({
        singingKeyProviders: [createInlineSigningKeyProvider(secret)],
        signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      });
    } catch (err) {
      expect((err as Error).message).toBe(
        'You are using both deprecated `singingKeyProviders` and its new replacement `signingKeyProviders` configuration. Please use only `signingKeyProviders`',
      );
    }
  });

  test('auth is passing when token is valid (RS256)', async () => {
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(JWKS_RSA512_PRIVATE_PEM)],
    });
    const token = buildJWT({ sub: '123' }, { key: JWKS_RSA512_PRIVATE_PEM, algorithm: 'RS256' });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        ctx: {
          jwt: {
            payload: {
              sub: '123',
            },
            token: {
              prefix: 'Bearer',
              value: expect.any(String),
            },
          },
        },
      },
    });
  });

  test('auth is passing when token is valid (RS256) with remote jwks', async () => {
    const jwksServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(
        JSON.stringify({
          keys: [
            {
              kty: 'RSA',
              e: 'AQAB',
              use: 'sig',
              kid: 'test_id',
              alg: 'RS512',
              n: 'jllePzkDl9e0O9Vuy1_qpSPUL8RQbuHOCQknWysfHlm6QGNqiyDY46AMfpaSb45bMYQjgOoL7nboe8Q1Qaz4M33PyV-_cYm9lY2cdxE72Vd7LlLFI-4q5uPbnX0ofb1kiD47I7KOKshbq2UzLnV6CDXBr5-LMZyXKOCNCEtvEytHwdXDosveJ0BzBaEY6tdJdmitGaXrqHj365Rms14x8uU6uSXZm3ZQYB_j5oiGu-JoGIIPGPyEQ4R0lThMCxXmmplcVUkfFrsth3WhQdzlRwXMPT1myvEA8Cro4nWTPKnL_W4e1r4CT1NjMDYPbDU0zJhBei8FCeCAW8DSjd7faw',
            },
          ],
        }),
      );
      res.end();
    }).listen();

    try {
      const test = createTestServer({
        signingKeyProviders: [
          createRemoteJwksSigningKeyProvider({
            jwksUri: `http://localhost:${(jwksServer.address() as any).port}`,
          }),
        ],
      });
      const token = buildJWT(
        { sub: '123' },
        { keyid: 'test_id', key: JWKS_RSA512_PRIVATE_PEM, algorithm: 'RS256' },
      );
      const response = await test.queryWithAuth(token);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        data: {
          ctx: {
            jwt: {
              payload: {
                sub: '123',
              },
              token: {
                prefix: 'Bearer',
                value: expect.any(String),
              },
            },
          },
        },
      });
    } finally {
      jwksServer.close();
    }
  });

  test('auth is passing when 1 of 2 providers is valid', async () => {
    const jwksServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ invalidJwks: true }));
      res.end();
    }).listen();

    try {
      const test = createTestServer({
        signingKeyProviders: [
          // Remote, invalid
          createRemoteJwksSigningKeyProvider({
            jwksUri: `http://localhost:${(jwksServer.address() as any).port}`,
          }),
          // Inline, valid
          createInlineSigningKeyProvider(JWKS_RSA512_PRIVATE_PEM),
        ],
      });
      const token = buildJWT(
        { sub: '123' },
        { keyid: 'test_id', key: JWKS_RSA512_PRIVATE_PEM, algorithm: 'RS256' },
      );
      const response = await test.queryWithAuth(token);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        data: {
          ctx: {
            jwt: {
              payload: {
                sub: '123',
              },
              token: {
                prefix: 'Bearer',
                value: expect.any(String),
              },
            },
          },
        },
      });
    } finally {
      jwksServer.close();
    }
  });

  test('should throw when lookup is configured for cookie but no cookie store available', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenLookupLocations: [extractFromCookie({ name: 'auth' })],
    });
    const token = buildJWT({ sub: '123' }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'Unexpected error.',
        },
      ],
    });
  });

  test('should support cookie lookup', async () => {
    const secret = 'topsecret';
    const test = createTestServer(
      {
        signingKeyProviders: [createInlineSigningKeyProvider(secret)],
        tokenLookupLocations: [extractFromCookie({ name: 'auth' })],
      },
      [useCookies<any>()],
    );
    const token = buildJWT({ sub: '123' }, { key: secret }, '');
    const response = await test.queryWithCookieAuth(token);
    expect(response.status).toBe(200);
  });

  test('custom getToken functiFailed to verify authentication token. Verifon', async () => {
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenLookupLocations: [
        async payload => {
          expect(payload.request).toBeDefined();
          expect(payload.serverContext).toBeDefined();
          expect(payload.url).toBeDefined();

          const authorizationHeader = payload.request.headers.get('Authorization');
          if (!authorizationHeader) return;

          const [prefix, token] = authorizationHeader.split(' ');
          if (!token) throw new Error(`Authentication header was set, but token is missing.`);

          return {
            prefix,
            token,
          };
        },
      ],
    });
    const token = buildJWT({ sub: '123' }, { key: secret });
    const response = await test.queryWithAuth(token);
    expect(response.status).toBe(200);
  });

  test('multiple lookup locations', async () => {
    const secret = 'topsecret';
    const test = createTestServer(
      {
        signingKeyProviders: [createInlineSigningKeyProvider(secret)],
        tokenLookupLocations: [
          extractFromHeader({
            name: 'Authorization',
            prefix: 'Bearer',
          }),
          extractFromCookie({
            name: 'auth',
          }),
        ],
      },
      [useCookies<any>()],
    );
    const token = buildJWT({ sub: '123' }, { key: secret }, '');

    // token in header is valid
    let response = await test.queryWithAuth(`Bearer ${token}`);
    expect(response.status).toBe(200);

    // token in cookie is valid
    response = await test.queryWithCookieAuth(token);
    expect(response.status).toBe(200);

    // no token is passed
    response = await test.queryWithoutAuth();
    expect(response.status).toBe(401);
  });

  test('handles GraphQL WS requests', async () => {
    expect.assertions(2);
    const secret = 'topsecret';
    const test = createTestServer({
      signingKeyProviders: [createInlineSigningKeyProvider(secret)],
      tokenLookupLocations: [
        extractFromHeader({
          name: 'Authorization',
          prefix: 'Bearer',
        }),
        extractFromConnectionParams({
          name: 'token',
        }),
      ],
    });
    const token = buildJWT({ sub: '123' }, { key: secret }, '');

    // token in header is valid
    const response = await test.queryWithAuth(`Bearer ${token}`);
    expect(response.status).toBe(200);

    server = createServer(test.yoga);
    const wss = new WebSocketServer({
      server,
      path: test.yoga.graphqlEndpoint,
    });

    useServer(
      {
        execute: (args: any) => args.execute(args),

        subscribe: (args: any) => args.subscribe(args),
        onSubscribe: async (ctx, _id, params) => {
          const { schema, execute, subscribe, contextFactory, parse, validate } =
            test.yoga.getEnveloped({
              ...ctx,
              req: ctx.extra.request,
              socket: ctx.extra.socket,
              params,
            });

          const args = {
            schema,
            operationName: params.operationName,
            document: parse(params.query),
            variableValues: params.variables,
            contextValue: await contextFactory(),
            execute,
            subscribe,
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
        },
      },

      // @ts-ignore - Typings are wrong
      wss,
    );

    await new Promise<void>((resolve, reject) => {
      server?.once('error', err => reject(err));
      server?.listen(0, () => resolve());
    });

    const url = `ws://localhost:${(server.address() as AddressInfo).port}${test.yoga.graphqlEndpoint}`;

    const client = createClient({
      webSocketImpl: WebSocket,
      url,
      retryAttempts: 0,
      connectionParams: {
        token,
      },
    });

    const iterator = client.iterate({
      query: '{ ctx }',
    });
    for await (const result of iterator) {
      expect(result).toMatchObject({
        data: {
          ctx: {
            jwt: {
              payload: {
                sub: '123',
              },
              token: {
                value: token,
              },
            },
          },
        },
      });
    }
    await client.dispose();
  });

  test('handles introspection query in case of conditional rejections', async () => {
    const secret = 'topsecret';
    const test = createTestServer(
      {
        signingKeyProviders: [createInlineSigningKeyProvider(secret)],
        tokenLookupLocations: [
          extractFromHeader({
            name: 'Authorization',
            prefix: 'Bearer',
          }),
        ],
        reject: {
          missingToken: false,
          invalidToken: false,
        },
        extendContext: 'jwt',
      },
      [],
      [
        useDisableIntrospection({
          isDisabled(_request, context) {
            if ('jwt' in context) {
              return false;
            }
            return true;
          },
        }),
      ],
    );
    const token = buildJWT({ sub: '123' }, { key: secret }, '');
    const resSuccessful = await test.yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: getIntrospectionQuery(),
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
    });
    expect(resSuccessful.status).toBe(200);
    const introspectionQueryResult = await resSuccessful.json();
    expect(introspectionQueryResult.errors).toBeUndefined();
    const introspection = introspectionQueryResult.data;
    const schemaFromIntrospection = buildClientSchema(introspection);
    expect(printSchema(schemaFromIntrospection)).toBe(printSchema(schema));
  });
});

const createTestServer = (
  options: JwtPluginOptions,
  initPlugins: Plugin[] = [],
  afterPlugins: Plugin[] = [],
) => {
  const yoga = createYoga({
    schema,
    logging: !!process.env['DEBUG'],
    plugins: [...initPlugins, useJWT(options), ...afterPlugins],
  });

  return {
    yoga,
    queryWithoutAuth: () =>
      yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
      }),
    queryWithCookieAuth: (token: string) =>
      yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          cookie: `auth=${token}`,
        },
      }),
    queryWithAuth: (authorization: string) =>
      yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization,
        },
      }),
  };
};

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    scalar JSON
    type Query {
      ctx: JSON
    }
  `,
  resolvers: {
    Query: {
      ctx: (_: never, __: never, ctx: unknown) => ctx,
    },
  },
});

const body = JSON.stringify({
  query: /* GraphQL */ `
    query {
      ctx
    }
  `,
});

const buildJWT = (
  payload: object,
  options: SignOptions & { key?: string; algorithm?: Algorithm | 'none' } = {},
  prefix = 'Bearer ',
) => {
  const { key = 'very secret key', ...signOptions } = options;

  const token = jwt.sign(payload, key, signOptions);

  return `${prefix}${token}`;
};

function buildJWTWithoutAlg(payload: object = {}, key = 'very secret key') {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify({ iss: 'http://yoga', ...payload })).toString(
    'base64',
  );
  const encodedJWT = `${header}.${encodedPayload}`;
  const signature = createHmac('sha256', key).update(encodedJWT).digest('base64');
  return `Bearer ${encodedJWT}.${signature}`;
}
