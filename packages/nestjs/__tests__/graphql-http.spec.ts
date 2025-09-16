import { serverAudits } from 'graphql-http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
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

afterAll(() => app.close());

describe('GraphQL over HTTP', () => {
  for (const audit of serverAudits({
    url: () => url,
    fetchFn: fetch,
  })) {
    if (
      // we dont control the JSON parsing
      audit.id === 'A5BF'
    ) {
      it.todo(audit.name);
    } else {
      it(audit.name, async () => {
        await expect(audit.fn()).resolves.toEqual(
          expect.objectContaining({
            status: 'ok',
          }),
        );
      });
    }
  }
});
