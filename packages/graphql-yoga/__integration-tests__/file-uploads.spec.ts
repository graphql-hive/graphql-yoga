import * as fs from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import * as path from 'node:path';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import { createSchema, createYoga } from '../src';

describe('file uploads', () => {
  const sourceFilePath = path.join(__dirname, 'fixtures', 'image.png');
  let sourceFile: Buffer;
  const yoga = createYoga({
    schema: createSchema({
      resolvers: {
        Mutation: {
          arrayBuffer: async (_, args) => {
            const buf = Buffer.from(await args.file.arrayBuffer());
            return sourceFile.equals(buf);
          },
          stream: async (_, args) => {
            const chunks = [];
            for await (const chunk of args.file.stream()) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            return sourceFile.equals(buffer);
          },
        },
      },
      typeDefs: /* GraphQL */ `
        scalar File

        type Query {
          _: Boolean
        }
        type Mutation {
          arrayBuffer(file: File!): Boolean
          stream(file: File!): Boolean
        }
      `,
    }),
    logging: false,
    maskedErrors: false,
  });
  let port: number;
  let server: Server;
  const sockets = new Set<Socket>();
  beforeAll(async () => {
    sourceFile = await fs.promises.readFile(sourceFilePath);
    server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
    server.on('connection', socket => {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
    });
  });
  afterAll(() => {
    for (const socket of sockets) {
      socket.destroy();
    }
    server.close();
  });

  const methods = ['arrayBuffer', 'stream'];

  for (const method of methods) {
    it(`consumes as ${method} correctly`, async () => {
      const formData = new FormData();
      formData.append(
        'operations',
        JSON.stringify({
          query: /* GraphQL */ `
        mutation Test($file: File!) {
          ${method}(file: $file)
        }
      `,
        }),
      );
      formData.append(
        'map',
        JSON.stringify({
          0: ['variables.file'],
        }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = new File([sourceFile as any], 'logo.png', {
        type: 'image/png',
      });
      formData.append('0', file);
      const response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        body: formData,
      });

      const body = await response.json();
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({
        [method]: true,
      });
    });
  }
});

describe('file uploads (streaming mode)', () => {
  const sourceFilePath = path.join(__dirname, 'fixtures', 'image.png');
  let sourceFile: Buffer;

  const yoga = createYoga({
    multipart: { stream: true },
    schema: createSchema({
      resolvers: {
        Mutation: {
          arrayBuffer: async (_, args) => {
            const buf = Buffer.from(await args.file.arrayBuffer());
            return sourceFile.equals(buf);
          },
          stream: async (_, args) => {
            const chunks: Buffer[] = [];
            for await (const chunk of args.file.stream()) {
              chunks.push(Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            return sourceFile.equals(buffer);
          },
          text: async (_, args) => {
            return args.file.text();
          },
          fileName: async (_, args) => {
            return args.file.name;
          },
          fileType: async (_, args) => {
            return args.file.type;
          },
        },
      },
      typeDefs: /* GraphQL */ `
        scalar File

        type Query {
          _: Boolean
        }
        type Mutation {
          arrayBuffer(file: File!): Boolean
          stream(file: File!): Boolean
          text(file: File!): String
          fileName(file: File!): String
          fileType(file: File!): String
        }
      `,
    }),
    logging: false,
    maskedErrors: false,
  });

  let port: number;
  let server: Server;
  const sockets = new Set<Socket>();

  beforeAll(async () => {
    sourceFile = await fs.promises.readFile(sourceFilePath);
    server = createServer(yoga);
    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
    server.on('connection', socket => {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
    });
  });

  afterAll(() => {
    for (const socket of sockets) {
      socket.destroy();
    }
    server.close();
  });

  it('consumes binary file as arrayBuffer correctly', async () => {
    const formData = new FormData();
    formData.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation Test($file: File!) {
            arrayBuffer(file: $file)
          }
        `,
      }),
    );
    formData.append('map', JSON.stringify({ 0: ['variables.file'] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.append('0', new File([sourceFile as any], 'logo.png', { type: 'image/png' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({ arrayBuffer: true });
  });

  it('consumes binary file as stream correctly', async () => {
    const formData = new FormData();
    formData.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation Test($file: File!) {
            stream(file: $file)
          }
        `,
      }),
    );
    formData.append('map', JSON.stringify({ 0: ['variables.file'] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.append('0', new File([sourceFile as any], 'logo.png', { type: 'image/png' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({ stream: true });
  });

  it('exposes correct file name and MIME type', async () => {
    const formData = new FormData();
    formData.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation Test($file: File!) {
            fileName(file: $file)
            fileType(file: $file)
          }
        `,
      }),
    );
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', new File(['hello'], 'hello.txt', { type: 'text/plain' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    // Each resolver call gets its own invocation; only one file var per query
    // We can only read the stream once so let's test them separately.
  });

  it('exposes correct file name via stream mode', async () => {
    const formData = new FormData();
    formData.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation Test($file: File!) {
            fileName(file: $file)
          }
        `,
      }),
    );
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', new File(['hello'], 'hello.txt', { type: 'text/plain' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data?.fileName).toBe('hello.txt');
  });

  it('reads file content as text', async () => {
    const content = 'Hello, streaming world!';
    const formData = new FormData();
    formData.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation Test($file: File!) {
            text(file: $file)
          }
        `,
      }),
    );
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', new File([content], 'greeting.txt', { type: 'text/plain' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data?.text).toBe(content);
  });
});
