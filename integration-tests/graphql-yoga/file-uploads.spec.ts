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
