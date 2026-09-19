import { serverAudits } from 'graphql-http';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
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

describe('GraphQL over HTTP', () => {
  for (const audit of serverAudits({
    url: getUrl,
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
