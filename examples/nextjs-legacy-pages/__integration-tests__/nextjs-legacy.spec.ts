import path from 'node:path';
import { rimrafSync } from 'rimraf';
import { fetch } from '@whatwg-node/fetch';
import {
  getAvailablePort,
  Proc,
  spawn,
  waitForAvailable,
} from '../../nextjs-app/__integration-tests__/utils';

jest.setTimeout(33_000);
const nodeMajorVersion = parseInt(process.version.split('.')[0].replace('v', ''), 10);

describe('NextJS Legacy Pages', () => {
  if (nodeMajorVersion < 20) {
    it.skip('skips', () => {});
    return;
  }
  let port: number;
  let serverProcess: Proc;
  beforeAll(async () => {
    rimrafSync(path.join(__dirname, '..', '.next'));
    const signal = AbortSignal.timeout(30_000);
    port = await getAvailablePort();
    serverProcess = await spawn('yarn', ['dev', '--webpack'], {
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

    expect(await response.text()).toContain('<title>Yoga GraphiQL</title>');
    expect(response.ok).toBe(true);
  });

  it('should run basic query', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query { greetings }',
      }),
    });

    expect({
      ...Object.fromEntries(response.headers.entries()),
      date: null,
      'keep-alive': null,
    }).toMatchObject({
      'content-type': 'application/json; charset=utf-8',
    });

    const json = await response.json();

    expect(json.errors).toBeFalsy();
    expect(json.data?.greetings).toBe('This is the `greetings` field of the root `Query` type');

    expect(response.ok).toBe(true);
  });
});
