import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { getIntrospectionQuery } from 'graphql';
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import { Request } from '@whatwg-node/fetch';

const listenerMap = new Map<string, Set<EventListenerOrEventListenerObject>>();

globalThis.self = {
  addEventListener(eventName: string, listener: EventListenerOrEventListenerObject) {
    let listeners = listenerMap.get(eventName);
    if (!listeners) {
      listeners = new Set();
      listenerMap.set(eventName, listeners);
    }
    listeners.add(listener);
  },
  removeEventListener(eventName: string, listener: EventListenerOrEventListenerObject) {
    const listeners = listenerMap.get(eventName);
    if (listeners) {
      listeners.delete(listener);
    }
  },
} as unknown as typeof globalThis.self;

function trigger(eventName: string, data) {
  // eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-explicit-any -- is Set
  listenerMap.get(eventName)?.forEach((listener: any) => {
    const listenerFn = listener.handleEvent ?? listener;
    listenerFn(data);
  });
}

describe('Service worker', () => {
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greetings: String
        }

        type Subscription {
          time: String
        }
      `,
      resolvers: {
        Query: {
          greetings: () => 'Hello world!',
        },
        Subscription: {
          time: {
            subscribe: () =>
              new Repeater(async (push, end) => {
                let ended = false;
                let i = 3;
                async function pushTime() {
                  if (ended) {
                    return end();
                  }
                  if (i) {
                    await setTimeout$(300);
                    await push(new Date().toISOString());
                    i--;
                    return pushTime();
                  }
                }

                end.then(() => {
                  ended = true;
                });

                return pushTime();
              }),
            resolve: value => value,
          },
        },
      },
    }),
  });

  beforeEach(() => {
    self.addEventListener('fetch', yoga);
  });
  afterEach(() => {
    self.removeEventListener('fetch', yoga);
  });
  it('should add fetch listener', async () => {
    expect(listenerMap.get('fetch')?.size).toBe(1);
  });

  it('should render GraphiQL', async () => {
    const response: Response = await new Promise(respondWith => {
      trigger('fetch', {
        request: new Request('http://localhost:3000/graphql', {
          method: 'GET',
          headers: {
            Accept: 'text/html',
          },
        }),
        respondWith,
      });
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(await response.text()).toMatch(/GraphiQL/);
  });

  it('succeeds introspection query', async () => {
    const response: Response = await new Promise(respondWith => {
      trigger('fetch', {
        request: new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: getIntrospectionQuery(),
          }),
        }),
        respondWith,
      });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toMatchObject({
      data: {
        __schema: {
          queryType: {
            name: 'Query',
          },
        },
      },
    });
  });

  it('handles subscriptions', async () => {
    expect.assertions(5);
    const response: Response = await new Promise(respondWith => {
      trigger('fetch', {
        request: new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: /* GraphQL */ `
              subscription {
                time
              }
            `,
          }),
        }),
        respondWith,
      });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    let counter = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      const data = Buffer.from(chunk).toString('utf-8');
      if (data === ':\n\n') {
        continue;
      }
      expect(data).toMatch(/data: {/);
      counter++;
      if (counter === 3) {
        break;
      }
    }
  });
});
