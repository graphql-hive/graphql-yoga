// import to start
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import server from '../server.js';

let stop = () => {
  // noop
};
beforeAll(async () => {
  stop = await server.start(53_000);
});
afterAll(() => stop());

describe('Next.js WebSockets', () => {
  it('should stream subscriptions over WebSocket', async () => {
    const client = createClient({
      url: 'ws://localhost:53000/api/graphql',
      webSocketImpl: WebSocket,
    });

    await expect(
      new Promise((resolve, reject) => {
        let value;
        client.subscribe(
          {
            query: 'subscription { ping }',
          },
          {
            next(val) {
              value = val;
            },
            error: reject,
            complete: () => resolve(value),
          },
        );
      }),
    ).resolves.toEqual({
      data: {
        ping: 'pong',
      },
    });
  });
});
