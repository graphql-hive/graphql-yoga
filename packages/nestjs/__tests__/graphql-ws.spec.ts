import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { Test } from '@nestjs/testing';
import { AppModule } from './fixtures/graphql/app.module';
import { useTestApp } from './utils/app';

const { getUrl } = useTestApp(() =>
  Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        subscriptions: {
          'graphql-ws': true,
        },
      }),
    ],
  }).compile(),
);

it('should subscribe using graphql-ws', async () => {
  const client = createClient({
    url: getUrl().replace('http', 'ws'),
    webSocketImpl: WebSocket,
    lazy: true,
    retryAttempts: 0,
  });

  await expect(
    new Promise((resolve, reject) => {
      const msgs: unknown[] = [];
      client.subscribe(
        {
          query: /* GraphQL */ `
            subscription {
              greetings
            }
          `,
        },
        {
          next(msg) {
            msgs.push(msg);
          },
          error: reject,
          complete: () => resolve(msgs),
        },
      );
    }),
  ).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": {
            "greetings": "Hi",
          },
        },
        {
          "data": {
            "greetings": "Bonjour",
          },
        },
        {
          "data": {
            "greetings": "Hola",
          },
        },
        {
          "data": {
            "greetings": "Ciao",
          },
        },
        {
          "data": {
            "greetings": "Zdravo",
          },
        },
      ]
    `);
});
