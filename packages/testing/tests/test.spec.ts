import { GraphQLError, parse } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { Plugin } from '@envelop/types';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('Test the testkit', () => {
  const createSchema = () =>
    makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
          bar: String
          fromContext: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => '1',
          bar: () => '2',
          fromContext: (_root, _args, context) => context.replaced,
        },
      },
    });

  it('Should replace parse function', async () => {
    const neverCalled: Plugin<any> = {
      onParse: jest.fn(),
    };
    const testkit = createTestkit([neverCalled], createSchema());
    testkit.mockPhase({ phase: 'parse', fn: () => parse('query test { foo }') });
    const result = await testkit.execute('query test { bar }');
    assertSingleExecutionValue(result);
    expect(result.data!.foo).toBeDefined();
    expect(result.data!.bar).not.toBeDefined();
    expect(neverCalled.onParse).not.toHaveBeenCalled();
  });

  it('Should replace validate function', async () => {
    const neverCalled: Plugin<any> = {
      onValidate: jest.fn(),
    };
    const testkit = createTestkit([neverCalled], createSchema());
    testkit.mockPhase({ phase: 'validate', fn: () => [new GraphQLError('test')] });
    const result = await testkit.execute('query test { bar }');
    assertSingleExecutionValue(result);
    expect(result.data).not.toBeDefined();
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0]!.message).toBe('test');
    expect(neverCalled.onValidate).not.toHaveBeenCalled();
  });

  it('Should replace execute function', async () => {
    const neverCalled: Plugin<any> = {
      onExecute: jest.fn(),
    };
    const testkit = createTestkit([neverCalled], createSchema());
    testkit.mockPhase({ phase: 'execute', fn: () => ({ data: { boop: true }, errros: [] }) });
    const result = await testkit.execute('query test { bar }');
    assertSingleExecutionValue(result);
    expect(result.data!.boop).toBeDefined();
    expect(result.data!.bar).not.toBeDefined();
    expect(result.data!.foo).not.toBeDefined();
    expect(neverCalled.onExecute).not.toHaveBeenCalled();
  });

  it('Should replace contextFactory function', async () => {
    const neverCalled: Plugin<any> = {
      onContextBuilding: jest.fn().mockReturnValue({ v: 1 }),
    };
    const testkit = createTestkit([neverCalled], createSchema());
    testkit.mockPhase({ phase: 'contextFactory', fn: async () => ({ replaced: 'mockedValue' }) });
    const result = await testkit.execute('query test { fromContext }');
    assertSingleExecutionValue(result);
    expect(result.data!.fromContext).toBe('mockedValue');
    expect(neverCalled.onContextBuilding).not.toHaveBeenCalled();
  });

  it('Should allow to override plugins', async () => {
    const addedPlugin: Plugin<any> = {
      onParse: jest.fn().mockReturnValue(undefined),
      onValidate: jest.fn().mockReturnValue(undefined),
    };
    const testkit = createTestkit([], createSchema());
    testkit.modifyPlugins(() => [addedPlugin]);
    const result = await testkit.execute('query test { foo }');
    assertSingleExecutionValue(result);
    expect(addedPlugin.onParse).toHaveBeenCalled();
    expect(addedPlugin.onValidate).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });

  it('Should use only 1 plugin', async () => {
    const plugin1: Plugin<any> = {
      onParse: jest.fn().mockReturnValue(undefined),
    };
    const plugin2: Plugin<any> = {
      onValidate: jest.fn().mockReturnValue(undefined),
    };

    const testkit = createTestkit([plugin1, false && plugin2], createSchema());
    const result = await testkit.execute('query test { foo }');
    assertSingleExecutionValue(result);
    expect(plugin1.onParse).toHaveBeenCalled();
    expect(plugin2.onValidate).not.toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });
});
