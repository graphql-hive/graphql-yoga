import { AfterResolver, OnResolveOptions, useOnResolve } from '@envelop/on-resolve';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('useOnResolve', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        value1: String!
        value2: String!
        obj: Obj!
      }

      type Obj {
        field1: String!
      }
    `,
    resolvers: {
      Query: {
        value1: () => 'value1',
        value2: () => 'value2',
        obj: () => ({
          field1: 'field1',
        }),
      },
    },
  });

  it('should invoke the callback for each resolver', async () => {
    const onResolveDoneFn = jest.fn();
    const onResolveFn = jest.fn((_opts: OnResolveOptions) => onResolveDoneFn);
    const testkit = createTestkit([useOnResolve(onResolveFn)], schema);

    await testkit.execute('{ test: value1, test1: value2 }');

    expect(onResolveFn).toHaveBeenCalledTimes(2);
    expect(onResolveDoneFn).toHaveBeenCalledTimes(2);

    let i = 0;
    for (const field of ['value1', 'value2']) {
      expect(onResolveFn.mock.calls[i]?.[0].context).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].root).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].args).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info.fieldName).toBe(field);
      expect(onResolveFn.mock.calls[i]?.[0].resolver).toBeInstanceOf(Function);
      expect(onResolveFn.mock.calls[i]?.[0].replaceResolver).toBeInstanceOf(Function);

      expect(onResolveDoneFn.mock.calls[i][0].result).toBe(field);
      expect(onResolveDoneFn.mock.calls[i][0].setResult).toBeInstanceOf(Function);

      i++;
    }
  });

  it('should invoke the callback for introspection when not skipping', async () => {
    const onResolveDoneFn = jest.fn();
    const onResolveFn = jest.fn((_opts: OnResolveOptions) => onResolveDoneFn);
    const testkit = createTestkit(
      [useOnResolve(onResolveFn, { skipIntrospection: false })],
      schema,
    );

    await testkit.execute('{ __schema{ ... on __Schema{ queryType { name } } } }');

    expect(onResolveFn).toHaveBeenCalledTimes(2);
    expect(onResolveDoneFn).toHaveBeenCalledTimes(2);

    let i = 0;
    for (const field of ['queryType', 'name']) {
      expect(onResolveFn.mock.calls[i]?.[0].context).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].root).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].args).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info.fieldName).toBe(field);
      expect(onResolveFn.mock.calls[i]?.[0].resolver).toBeInstanceOf(Function);
      expect(onResolveFn.mock.calls[i]?.[0].replaceResolver).toBeInstanceOf(Function);

      expect(onResolveDoneFn.mock.calls[i][0].setResult).toBeInstanceOf(Function);

      i++;
    }
  });

  it('should not invoke the callback for introspection when skipping', async () => {
    const onResolveDoneFn = jest.fn();
    const onResolveFn = jest.fn((_opts: OnResolveOptions) => onResolveDoneFn);
    const testkit = createTestkit([useOnResolve(onResolveFn, { skipIntrospection: true })], schema);

    await testkit.execute('{ __schema{ ... on __Schema{ queryType { name } } } }');

    expect(onResolveFn).toHaveBeenCalledTimes(0);
    expect(onResolveDoneFn).toHaveBeenCalledTimes(0);
  });

  it('should invoke the callback for default resolvers when not skipping', async () => {
    const onResolveDoneFn = jest.fn();
    const onResolveFn = jest.fn((_opts: OnResolveOptions) => onResolveDoneFn);
    const testkit = createTestkit(
      [useOnResolve(onResolveFn, { skipDefaultResolvers: false })],
      schema,
    );

    await testkit.execute('{ obj { field1 } }');

    expect(onResolveFn).toHaveBeenCalledTimes(2);
    expect(onResolveDoneFn).toHaveBeenCalledTimes(2);

    let i = 0;
    for (const field of ['obj', 'field1']) {
      expect(onResolveFn.mock.calls[i]?.[0].context).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].root).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].args).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info).toBeDefined();
      expect(onResolveFn.mock.calls[i]?.[0].info.fieldName).toBe(field);
      expect(onResolveFn.mock.calls[i]?.[0].resolver).toBeInstanceOf(Function);
      expect(onResolveFn.mock.calls[i]?.[0].replaceResolver).toBeInstanceOf(Function);

      i++;
    }
  });

  it('should not invoke the callback for default resolvers when skipping', async () => {
    const onResolveDoneFn = jest.fn();
    const onResolveFn = jest.fn((_opts: OnResolveOptions) => onResolveDoneFn);
    const testkit = createTestkit(
      [useOnResolve(onResolveFn, { skipDefaultResolvers: true })],
      schema,
    );

    await testkit.execute('{ obj { field1 } }');

    expect(onResolveFn).toHaveBeenCalledTimes(1);
    expect(onResolveDoneFn).toHaveBeenCalledTimes(1);
  });

  it('should replace the result using the after hook', async () => {
    const testkit = createTestkit(
      [
        useOnResolve(() => ({ setResult }) => {
          setResult('value2');
        }),
      ],
      schema,
    );

    const result = await testkit.execute('{ value1 }');
    assertSingleExecutionValue(result);

    expect(result.data?.value1).toBe('value2');
  });

  it('should only execute the onResolve function once after the schema has been replaced', async () => {
    const afterResolve: AfterResolver = jest.fn(({ setResult }) => {
      setResult('value2');
    });
    const testkit = createTestkit(
      [
        useOnResolve(() => afterResolve),
        // This _should_ trigger another afterResolve call
        useOnResolve(() => afterResolve),
        // This should _NOT_ trigger another afterResolve call
        {
          onSchemaChange({ schema, replaceSchema }) {
            replaceSchema(schema);
          },
        },
      ],
      schema,
    );

    const result = await testkit.execute('{ value1 }');
    // Expect two calls, not four.
    expect(afterResolve).toHaveBeenCalledTimes(2);

    assertSingleExecutionValue(result);
    expect(result.data?.value1).toBe('value2');
  });
});
