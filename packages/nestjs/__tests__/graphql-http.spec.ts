import { serverAudits } from 'graphql-http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { AppModule } from './fixtures/graphql/app.module';

const module = await Test.createTestingModule({
  imports: [AppModule.forRoot({})],
}).compile();
const app: INestApplication = module.createNestApplication();
await app.listen(0);
const url = (await app.getUrl()) + '/graphql';

afterAll(() => app.close());

describe('GraphQL over HTTP', () => {
  for (const audit of serverAudits({
    url,
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
