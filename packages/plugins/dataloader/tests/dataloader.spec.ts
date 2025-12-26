import DataLoader from 'dataloader';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useDataLoader } from '../src/index.js';

describe('useDataLoader', () => {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { test: String! }`,
    resolvers: {
      Query: {
        test: (_root, _args, context: { test: DataLoader<string, string> }) =>
          context.test.load('1'),
      },
    },
  });

  it('Should inject dataloader correctly to context, based on name', async () => {
    const testInstance = createTestkit(
      [
        useDataLoader(
          'test',
          () =>
            new DataLoader<string, string>(async () => {
              return ['myValue'];
            }),
        ),
      ],
      schema,
    );

    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.data?.test).toBe('myValue');
  });
});
