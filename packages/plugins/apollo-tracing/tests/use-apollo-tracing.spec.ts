import 'reflect-metadata';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useApolloTracing } from '../src/index.js';

describe('useApolloTracing', () => {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { foo: String }`,
    resolvers: {
      Query: {
        foo: () => new Promise(resolve => setTimeout(() => resolve('boop'), 1000)),
      },
    },
  });

  it('should measure execution times and return it as extension', async () => {
    const testInstance = createTestkit([useApolloTracing()], schema);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.extensions?.tracing).toBeDefined();
    // If you wonder why, we do this all for v16 compat which changed types of extensions to unknown
    const tracing: any = result.extensions?.tracing;
    expect(tracing.duration).toBeGreaterThan(900000000);
    expect(tracing.execution.resolvers[0].duration).toBeGreaterThan(900000000);
    expect(tracing.execution.resolvers[0].path).toEqual(['foo']);
    expect(tracing.execution.resolvers[0].parentType).toBe('Query');
    expect(tracing.execution.resolvers[0].fieldName).toBe('foo');
    expect(tracing.execution.resolvers[0].returnType).toBe('String');
  });
});
