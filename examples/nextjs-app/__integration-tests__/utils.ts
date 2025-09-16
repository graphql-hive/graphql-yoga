import cp from 'node:child_process';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

export interface Proc {
  waitForExit: Promise<void>;
  kill(): Promise<void>;
  stdboth: string;
}

export function spawn(
  cmd: string,
  args: string[],
  { signal, env }: { signal: AbortSignal; env?: Record<string, string> },
): Promise<Proc> {
  const proc = cp.spawn(cmd, args, {
    // ignore stdin because we're not feeding the process anything, pipe stdout and stderr
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.join(module.path, '..'),
    signal,
    env: {
      // @ts-ignore this runs inside jest so process is always available
      ...process.env,
      ...env,
    },
  });

  let stdboth = '';
  proc.stdout.on('data', x => {
    stdboth += x.toString();
  });
  proc.stderr.on('data', x => {
    stdboth += x.toString();
  });

  const waitForExit = new Promise<void>((resolve, reject) => {
    proc.once('exit', () => {
      proc.stdout.destroy();
      proc.stderr.destroy();
    });
    proc.once('close', code => {
      // process ended _and_ the stdio streams have been closed
      if (code) {
        reject(new Error(`Exit code ${code}\n${stdboth}`));
      } else {
        resolve();
      }
    });
  });

  return new Promise((resolve, reject) => {
    waitForExit.catch(reject);
    proc.once('spawn', () =>
      resolve({
        waitForExit,
        kill() {
          proc.kill();
          return waitForExit;
        },
        get stdboth() {
          return stdboth;
        },
      }),
    );
  });
}

export function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      server.close(err => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

export async function waitForAvailable(
  urlOrPort: string | number,
  { signal }: { signal: AbortSignal },
) {
  for (;;) {
    signal.throwIfAborted();
    try {
      await fetch(typeof urlOrPort === 'number' ? `http://0.0.0.0:${urlOrPort}` : urlOrPort, {
        signal,
      });
      break;
    } catch {}
    await setTimeout(500);
  }
}
