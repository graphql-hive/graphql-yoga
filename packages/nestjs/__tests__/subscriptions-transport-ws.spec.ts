import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocket } from 'ws';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './fixtures/graphql/app.module';

let app: INestApplication, url: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        subscriptions: {
          'subscriptions-transport-ws': true,
        },
      }),
    ],
  }).compile();
  app = module.createNestApplication();
  await app.listen(0);
  url = (await app.getUrl()) + '/graphql';
});

afterAll(() => {
  app.close();
});

it('should subscribe using subscriptions-transport-ws', async () => {
  const client = new SubscriptionClient(
    url.replace('http', 'ws'),
    {
      lazy: true,
      reconnectionAttempts: 0,
    },
    WebSocket,
  );

  await expect(
    new Promise((resolve, reject) => {
      const msgs: unknown[] = [];
      const obs = client.request({
        query: /* GraphQL */ `
          subscription {
            greetings
          }
        `,
      });
      obs.subscribe({
        next(msg) {
          msgs.push(msg);
        },
        error: reject,
        complete: () => {
          resolve(msgs);
        },
      });
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

  // somehow, even in lazy mode, it keeps the connection after subscriptions complete
  client.close();
});
