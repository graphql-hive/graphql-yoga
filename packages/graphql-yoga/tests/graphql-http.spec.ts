import { serverAudits } from 'graphql-http';
import { createSchema, createYoga } from '../src/index.js';

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        _: String
      }
    `,
  }),
});

for (const audit of serverAudits({
  url: 'http://yoga/graphql',
  fetchFn: yoga.fetch,
})) {
  test(audit.name, async () => {
    const result = await audit.fn();
    if (result.status !== 'ok') {
      throw result.reason;
    }
  });
}
