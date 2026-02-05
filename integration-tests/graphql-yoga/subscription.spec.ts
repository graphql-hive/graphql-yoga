import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { ExecutionResult } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { fakePromise } from '@whatwg-node/server';
import { createSchema, createYoga } from '../src';

describe('subscription', () => {
  test('Subscription is closed properly', async () => {
    let counter = 0;

    let onIteratorDone: () => void;
    const waitIteratorDone = new Promise<void>(resolve => {
      onIteratorDone = resolve;
    });

    const fakeIterator: AsyncIterableIterator<ExecutionResult> = {
      [Symbol.asyncIterator]: () => fakeIterator,
      async next() {
        counter++;
        await new Promise(resolve => setImmediate(resolve));
        return {
          done: false,
          value: {
            data: {
              counter,
            },
          },
        };
      },
      return: jest.fn(() => {
        onIteratorDone();
        return fakePromise({ done: true, value: undefined });
      }),
    };
    const yoga = createYoga({
      logging: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            _: Boolean
          }
          type Subscription {
            foo: String
          }
        `,
        resolvers: {
          Subscription: {
            foo: {
              resolve: () => 'bar',
              subscribe: () => fakeIterator,
            },
          },
        },
      }),
      maskedErrors: false,
    });
    const server = createServer(yoga);
    try {
      await new Promise<void>(resolve => server.listen(0, resolve));
      const port = (server.address() as AddressInfo).port;

      // Start and Close a HTTP SSE subscription
      // eslint-disable-next-line no-async-promise-executor
      await new Promise<void>(async resolve => {
        const response = await fetch(`http://localhost:${port}/graphql?query=subscription{foo}`, {
          headers: {
            Accept: 'text/event-stream',
          },
        });
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('text/event-stream');

        for await (const chunk of response.body!) {
          const str = Buffer.from(chunk).toString('utf-8');
          if (str?.trim()) {
            break;
          }
        }
        resolve();
      });

      await waitIteratorDone;
      expect(fakeIterator.return).toHaveBeenCalled();
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
