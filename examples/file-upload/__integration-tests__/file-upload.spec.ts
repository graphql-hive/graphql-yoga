import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import * as path from 'node:path';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import { yoga } from '../yoga';

function md5File(path: string) {
  return new Promise((resolve, reject) => {
    const output = crypto.createHash('md5');
    const input = fs.createReadStream(path);

    input.on('error', err => {
      reject(err);
    });

    output.once('readable', () => {
      resolve(output.read().toString('hex'));
    });

    input.pipe(output);
  });
}

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

  it('should execute query', async () => {
    const response = await fetch(`http://localhost:${port}/graphql?query=query{hello}`);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      hello: 'Hello World',
    });
  });

  it('should save file', async () => {
    const sourceFilePath = path.join(__dirname, 'fixtures', 'image.jpg');
    const sourceMd5 = await md5File(sourceFilePath);

    const formData = new FormData();
    formData.set(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation saveFile($file: File!) {
            saveFile(file: $file)
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
          type: 'image/jpg',
        },
      ),
    );

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      saveFile: true,
    });

    const targetFilePath = path.join(__dirname, '..', 'image.jpg');
    await fs.promises.stat(targetFilePath);
    const targetMd5 = await md5File(targetFilePath);
    expect(targetMd5).toEqual(sourceMd5);
    fs.promises.unlink(targetFilePath);
    expect(targetMd5).toBe(sourceMd5);
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

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toBeDefined();
  });
});
