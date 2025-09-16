import { version } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { getAvailablePort, Proc, spawn, waitForAvailable } from './utils';

jest.setTimeout(33_000);

describe('nextjs 13 App Router', () => {
  if (version.startsWith('15.')) {
    it.skip('skips for v15', () => {});
    return;
  }
  let port: number;
  let serverProcess: Proc;
  beforeAll(async () => {
    const signal = AbortSignal.timeout(30_000);
    port = await getAvailablePort();
    serverProcess = await spawn('pnpm', ['dev'], {
      signal,
      env: { PORT: String(port) },
    });
    await waitForAvailable(port, { signal });
  });
  afterAll(() => serverProcess?.kill());

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
