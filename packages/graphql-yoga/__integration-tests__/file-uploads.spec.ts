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
    // Neither resolver consumes the stream, so both can be queried together.
    formData.append('0', new File(['hello'], 'hello.txt', { type: 'text/plain' }));

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data?.fileName).toBe('hello.txt');
    expect(body.data?.fileType).toBe('text/plain');
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

  it('streams file lazily — resolver starts before all bytes arrive', async () => {
    // Build the multipart body manually as a slow ReadableStream so we can
    // verify the server resolves the GraphQL operation (and therefore starts
    // calling the resolver) before the full file payload has been sent.
    const boundary = 'lazy-boundary-test';
    const fileContent = 'chunk1chunk2chunk3';

    const operations = JSON.stringify({
      query: /* GraphQL */ `
        mutation Test($file: File!) {
          stream(file: $file)
        }
      `,
    });
    const map = JSON.stringify({ '0': ['variables.file'] });

    const enc = new TextEncoder();
    const preamble =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="operations"\r\n\r\n` +
      `${operations}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="map"\r\n\r\n` +
      `${map}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="0"; filename="lazy.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n`;

    // Track when the resolver begins consuming the stream
    let resolverStartedBeforeAllBytesSent = false;
    let allBytesSent = false;

    // Replace the yoga's resolver with a spy that records timing
    const localYoga = createYoga({
      schema: createSchema({
        resolvers: {
          Mutation: {
            stream: async (_: unknown, args: { file: File }) => {
              resolverStartedBeforeAllBytesSent = !allBytesSent;
              const chunks: Buffer[] = [];
              for await (const chunk of (args.file as File).stream()) {
                chunks.push(Buffer.from(chunk));
              }
              return Buffer.concat(chunks).toString() === fileContent;
            },
          },
        },
        typeDefs: /* GraphQL */ `
          scalar File
          type Query {
            _: Boolean
          }
          type Mutation {
            stream(file: File!): Boolean
          }
        `,
      }),
      logging: false,
      maskedErrors: false,
    });

    const localServer = createServer(localYoga);
    const localPort = await new Promise<number>(resolve =>
      localServer.listen(0, () =>
        resolve((localServer.address() as import('node:net').AddressInfo).port),
      ),
    );

    try {
      // Build the body as a ReadableStream that delays the file bytes
      let sendFileChunks!: () => void;
      const fileChunksReady = new Promise<void>(res => (sendFileChunks = res));

      const bodyStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(enc.encode(preamble));
          // Wait until signalled before sending file bytes
          await fileChunksReady;
          controller.enqueue(enc.encode(fileContent));
          controller.enqueue(enc.encode(`\r\n--${boundary}--\r\n`));
          controller.close();
          allBytesSent = true;
        },
      });

      const fetchPromise = fetch(`http://localhost:${localPort}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: bodyStream,
        // duplex is required by Node.js fetch for streaming request bodies but is
        // not in the standard RequestInit type yet.
        ...({ duplex: 'half' } as object),
      } as RequestInit);

      // Give the server a moment to parse the text fields and call the resolver
      await new Promise(r => setTimeout(r, 50));
      // Now release the file bytes
      sendFileChunks();

      const response = await fetchPromise;
      const body = await response.json();
      expect(body.errors).toBeUndefined();
      expect(body.data?.stream).toBe(true);
      expect(resolverStartedBeforeAllBytesSent).toBe(true);
    } finally {
      await new Promise<void>(res => localServer.close(() => res()));
    }
  });
});

describe('file uploads (limits)', () => {
  it('rejects files that exceed the fileSize limit', async () => {
    const yoga = createYoga({
      multipart: { limits: { fileSize: 10 } },
      schema: createSchema({
        resolvers: {
          Mutation: {
            stream: async (_: unknown, args: { file: File }) => {
              // consume the stream so the parser can report the error
              for await (const _ of (args.file as File).stream()) {
                // drain
              }
              return true;
            },
          },
        },
        typeDefs: /* GraphQL */ `
          scalar File
          type Query {
            _: Boolean
          }
          type Mutation {
            stream(file: File!): Boolean
          }
        `,
      }),
      logging: false,
      maskedErrors: false,
    });

    const server = createServer(yoga);
    const port = await new Promise<number>(res =>
      server.listen(0, () => res((server.address() as import('node:net').AddressInfo).port)),
    );

    try {
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
      formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
      formData.append(
        '0',
        new File(['this content is definitely more than 10 bytes'], 'big.txt', {
          type: 'text/plain',
        }),
      );

      const response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        body: formData,
      });
      expect(response.status).toBe(413);
    } finally {
      await new Promise<void>(res => server.close(() => res()));
    }
  });

  it('rejects requests that exceed the files limit', async () => {
    const yoga = createYoga({
      multipart: { limits: { files: 1 } },
      schema: createSchema({
        resolvers: {
          Mutation: {
            stream: async (_: unknown, args: { file: File }) => {
              for await (const _ of (args.file as File).stream()) {
                /* drain */
              }
              return true;
            },
          },
        },
        typeDefs: /* GraphQL */ `
          scalar File
          type Query {
            _: Boolean
          }
          type Mutation {
            stream(file: File!): Boolean
          }
        `,
      }),
      logging: false,
      maskedErrors: false,
    });

    const server = createServer(yoga);
    const port = await new Promise<number>(res =>
      server.listen(0, () => res((server.address() as import('node:net').AddressInfo).port)),
    );

    try {
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
      formData.append('map', JSON.stringify({ '0': ['variables.file'], '1': ['variables.file'] }));
      formData.append('0', new File(['hello'], 'a.txt', { type: 'text/plain' }));
      formData.append('1', new File(['world'], 'b.txt', { type: 'text/plain' }));

      const response = await fetch(`http://localhost:${port}/graphql`, {
        method: 'POST',
        body: formData,
      });
      expect(response.status).toBe(413);
    } finally {
      await new Promise<void>(res => server.close(() => res()));
    }
  });
});
