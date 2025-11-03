import path from 'node:path';
import { version } from 'graphql';
import { rimrafSync } from 'rimraf';
import { fetch } from '@whatwg-node/fetch';
import { getAvailablePort, Proc, spawn, waitForAvailable } from './utils';

jest.setTimeout(33_000);

const nodeMajorVersion = parseInt(process.version.split('.')[0].replace('v', ''), 10);

describe('nextjs 13 App Router', () => {
  if (version.startsWith('15.') || nodeMajorVersion < 20) {
    it.skip('skips for v15', () => {});
    return;
  }
  let port: number;
  let serverProcess: Proc;
  beforeAll(async () => {
    rimrafSync(path.join(__dirname, '..', '.next'));
    const signal = AbortSignal.timeout(30_000);
    port = await getAvailablePort();
    serverProcess = await spawn('pnpm', ['dev'], {
      signal,
      env: { PORT: String(port) },
      cwd: path.join(__dirname, '..'),
    });
    await waitForAvailable(port, { signal });
  });
  afterAll(() => {
    rimrafSync(path.join(__dirname, '..', '.next'));
    return serverProcess?.kill();
  });

  it('should show GraphiQL', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/graphql`, {
      headers: {
        accept: 'text/html',
      },
    });

    expect(response.ok).toBe(true);
    expect(await response.text()).toContain('Yoga GraphiQL');
  });

  it('should run basic query', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        connection: 'close',
      },
      body: JSON.stringify({
        query: 'query { greetings }',
      }),
    });

    expect(response.ok).toBe(true);

    expect({
      ...Object.fromEntries(response.headers.entries()),
      date: null,
      'keep-alive': null,
      connection: null,
    }).toMatchInlineSnapshot(`
{
  "connection": null,
  "content-type": "application/json; charset=utf-8",
  "date": null,
  "keep-alive": null,
  "transfer-encoding": "chunked",
  "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch",
}
`);

    const json = await response.json();

    expect(json.errors).toBeFalsy();
    expect(json.data?.greetings).toBe('This is the `greetings` field of the root `Query` type');
  });
});
