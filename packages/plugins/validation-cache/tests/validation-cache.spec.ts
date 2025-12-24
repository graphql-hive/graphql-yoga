import { buildSchema, GraphQLError, NoSchemaIntrospectionCustomRule, validate } from 'graphql';
import { LRUCache } from 'lru-cache';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { Plugin } from '@envelop/types';
import { useValidationCache } from '../src/index.js';

describe('useValidationCache', () => {
  const testSchema = buildSchema(/* GraphQL */ `
    type Query {
      foo: String
    }
  `);

  let testValidator: jest.Mock<typeof validate>;
  let useTestPlugin: Plugin<any>;

  beforeEach(() => {
    testValidator = jest.fn().mockImplementation((source, options) => validate(source, options));

    useTestPlugin = {
      onValidate({ setValidationFn }) {
        setValidationFn(testValidator as any as typeof validate);
      },
    };
  });

  afterEach(() => {
    testValidator.mockReset();
  });

  it('Should call original validate when cache is empty', async () => {
    const testInstance = createTestkit([useTestPlugin, useValidationCache()], testSchema);
    await testInstance.execute(`query { foo }`);
    expect(testValidator).toHaveBeenCalledTimes(1);
  });

  it('Should call validate once once when operation is cached', async () => {
    const testInstance = createTestkit([useTestPlugin, useValidationCache()], testSchema);
    await testInstance.execute(`query { foo }`);
    await testInstance.execute(`query { foo }`);
    await testInstance.execute(`query { foo }`);
    expect(testValidator).toHaveBeenCalledTimes(1);
  });

  it('Should call validate once once when operation is cached and errored', async () => {
    const testInstance = createTestkit([useTestPlugin, useValidationCache()], testSchema);
    const r1 = await testInstance.execute(`query { foo2 }`);
    const r2 = await testInstance.execute(`query { foo2 }`);
    expect(testValidator).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
  });

  it('Should call validate multiple times on different operations', async () => {
    const testInstance = createTestkit([useTestPlugin, useValidationCache()], testSchema);
    await testInstance.execute(`query t { foo }`);
    await testInstance.execute(`query t2 { foo }`);
    expect(testValidator).toHaveBeenCalledTimes(2);
  });

  it('should call validate multiple times when operation is invalidated', async () => {
    const cache = new LRUCache<string, readonly GraphQLError[]>({
      max: 100,
      ttl: 1,
    });
    const testInstance = createTestkit(
      [
        useTestPlugin,
        useValidationCache({
          cache,
        }),
      ],
      testSchema,
    );
    await testInstance.execute(`query t { foo }`);
    await testInstance.wait(10);
    await testInstance.execute(`query t { foo }`);
    expect(testValidator).toHaveBeenCalledTimes(2);
  });

  it('should use provided cache instance', async () => {
    const cache = new LRUCache<string, readonly GraphQLError[]>({ max: 100 });
    jest.spyOn(cache, 'set');
    jest.spyOn(cache, 'get');
    const testInstance = createTestkit(
      [
        useTestPlugin,
        useValidationCache({
          cache,
        }),
      ],
      testSchema,
    );
    await testInstance.execute(`query { foo2 }`);
    await testInstance.execute(`query { foo2 }`);
    expect(cache.get).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
  });

  it('does not share cache across different validation rules', async () => {
    let counter = 0;
    const plugin: Plugin = {
      onValidate(ctx) {
        counter = counter + 1;
        if (counter > 1) {
          ctx.addValidationRule(NoSchemaIntrospectionCustomRule);
        }
      },
    };

    const testInstance = createTestkit([plugin, useValidationCache()], testSchema);
    let result = await testInstance.execute(`{ __schema { types { name } } }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    result = await testInstance.execute(`{ __schema { types { name } } }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
  });

  it('includes schema in the cache key', async () => {
    const schema1 = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
      }
    `);
    const schema2 = buildSchema(/* GraphQL */ `
      type Query {
        foo1: String
      }
    `);

    let currentSchema = schema1;
    const dynamicSchema: Plugin = {
      onEnveloped({ setSchema }) {
        setSchema(currentSchema);
      },
    };

    const testInstance = createTestkit(
      [useTestPlugin, dynamicSchema, useValidationCache()],
      testSchema,
    );
    await testInstance.execute(`{ __schema { types { name } } }`);
    expect(testValidator).toHaveBeenCalledTimes(1);

    currentSchema = schema2;
    await testInstance.execute(`{ __schema { types { name } } }`);
    expect(testValidator).toHaveBeenCalledTimes(2);
    currentSchema = schema1;
    await testInstance.execute(`{ __schema { types { name } } }`);
    // should still be two, because the cache key includes the schema
    expect(testValidator).toHaveBeenCalledTimes(2);
  });
});
