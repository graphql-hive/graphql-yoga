import * as fs from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import * as path from 'node:path';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import yoga from '../pages/api/graphql';

describe('file-upload-nextjs-pothos example integration', () => {
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

  it('should execute query', async () => {
    const response = await fetch(`http://localhost:${port}/api/graphql?query=query{greetings}`);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      greetings: 'Hello World',
    });
  });

  it('should read file text', async () => {
    const sourceFilePath = path.join(__dirname, '..', '..', '..', 'website', 'public', 'logo.png');

    const formData = new FormData();
    formData.set(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation readTextFile($file: File!) {
            readTextFile(file: $file)
          }
        `,
      }),
    );
    formData.set('map', JSON.stringify({ 0: ['variables.file'] }));
    formData.set(
      '0',
      new File(
        [(await fs.promises.readFile(sourceFilePath)) as any],
        path.basename(sourceFilePath),
        {
          type: 'image/png',
        },
      ),
    );

    const response = await fetch(`http://localhost:${port}/api/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toBeDefined();
  });
});
