import { createClient } from 'graphql-ws';
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
          'graphql-ws': true,
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

it('should subscribe using graphql-ws', async () => {
  const client = createClient({
    url: url.replace('http', 'ws'),
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
