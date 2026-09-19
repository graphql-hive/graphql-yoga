import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocket } from 'ws';
import { Test } from '@nestjs/testing';
import { AppModule } from './fixtures/graphql/app.module';
import { useTestApp } from './utils/app';

// @nestjs/graphql v14 (as shipped for NestJS 12) dropped server-side support for the legacy
// subscriptions-transport-ws protocol: `GqlSubscriptionService` no longer wires up anything for
// it, so the client below would connect but never receive a response, hanging indefinitely.
const nestjsGraphqlMajor = parseInt(
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('@nestjs/graphql/package.json') as { version: string }).version.split('.')[0]!,
  10,
);
const describeIfSupported = nestjsGraphqlMajor < 14 ? describe : describe.skip;

describeIfSupported('subscriptions-transport-ws', () => {
  const { getUrl } = useTestApp(() =>
    Test.createTestingModule({
      imports: [
        AppModule.forRoot({
          subscriptions: {
            'subscriptions-transport-ws': true,
          },
        }),
      ],
    }).compile(),
  );

  it('should subscribe using subscriptions-transport-ws', async () => {
    const client = new SubscriptionClient(
      getUrl().replace('http', 'ws'),
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

    client.close();
  });
});
