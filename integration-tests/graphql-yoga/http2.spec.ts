import {
  ClientHttp2Session,
  connect,
  constants,
  createSecureServer,
  Http2SecureServer,
} from 'node:http2';
import { AddressInfo } from 'node:net';
import { createSchema, createYoga } from 'graphql-yoga';
import type { CertificateCreationResult } from 'pem';

describe('HTTP2', () => {
  let client: ClientHttp2Session;
  let server: Http2SecureServer;
  let keys: CertificateCreationResult;
  beforeAll(async () => {
    const { createCertificate } = await import('pem');
    keys = await new Promise<CertificateCreationResult>((resolve, reject) => {
      createCertificate(
        {
          selfSigned: true,
          days: 1,
        },
        (err, result) => (err ? reject(err) : resolve(result)),
      );
    });
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String!
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
    });

    // Create a secure HTTP/2 server
    server = createSecureServer(
      {
        allowHTTP1: false,
        key: keys.serviceKey,
        cert: keys.certificate,
      },
      yoga,
    );

    await new Promise<void>(resolve => server.listen(0, resolve));

    const serverAddress = server.address() as AddressInfo;
    client = await new Promise<ClientHttp2Session>((resolve, reject) => {
      const session = connect(
        `https://localhost:${serverAddress.port}`,
        {
          ca: keys.certificate,
        },
        () => {
          resolve(session);
        },
      );
      session.on('error', reject);
    });
  });
  afterAll(async () => {
    if (client) {
      await new Promise<void>(resolve => client.close(resolve));
    }
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve())),
      );
    }
  });
  it('works', done => {
    const req = client.request({
      [constants.HTTP2_HEADER_METHOD]: 'POST',
      [constants.HTTP2_HEADER_PATH]: '/graphql',
      [constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/json',
    });
    let data: string = '';
    req.on('response', headers => {
      expect(headers[':status']).toBe(200);
    });
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += Buffer.from(chunk).toString('utf-8');
    });
    req.on('end', () => {
      expect(JSON.parse(data)).toEqual({ data: { hello: 'world' } });
      done();
    });
    req.write(
      JSON.stringify({
        query: /* GraphQL */ `
          query {
            hello
          }
        `,
      }),
    );
    req.end();
  });
});
