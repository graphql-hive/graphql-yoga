import { parse } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { usePersistedOperations } from '../src/index.js';

describe('usePersistedOperations', () => {
  const testSchema = makeExecutableSchema({
    resolvers: {
      Query: {
        foo: () => 'test',
      },
    },
    typeDefs: /* GraphQL */ `
      type Query {
        foo: String
      }
    `,
  });

  it('Should allow running persisted operations from source', async () => {
    const store = new Map([['persisted_1', `query { foo }`]]);

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`persisted_1`, {}, {});
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data?.foo).toBe('test');
  });

  it('Should fail when store is empty and `onlyPersisted` is true', async () => {
    const store = new Map();

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`persisted_1`);
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.message).toBe(`Unable to match operation with id 'persisted_1'`);
  });

  it('Should fail when persisted operation is not available and `onlyPersisted` is true', async () => {
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`persisted_2`);
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.message).toBe(`Unable to match operation with id 'persisted_2'`);
  });

  it('Should allow standard query parsing when `onlyPersisted` is false and source is invalid', async () => {
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: false,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`invalid`);
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.message).toBe(`Syntax Error: Unexpected Name "invalid".`);
  });

  it('Should allow standard query parsing when `onlyPersisted` is false and source is valid', async () => {
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: false,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data?.foo).toBe('test');
  });

  it('Should prevent standard query parsing when `onlyPersisted` is true and source is valid', async () => {
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);

    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.message).toBe('Must provide operation id');
  });

  it('Should fail when no store is returned and only `onlyPersisted` is true', async () => {
    const store = () => undefined as any;
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1');
    assertSingleExecutionValue(result);
    expect(result.errors?.[0]?.message).toBe('Must provide store for persisted-operations!');
  });

  it('Should allow store function to return actual persisted operations store, using context value', async () => {
    const initialContext = { storeId: 'custom' };
    const customStore = new Map([['persisted_1', parse(`query { foo }`)]]);
    const globalStore = new Map();
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store: context => (context['storeId'] === 'custom' ? customStore : globalStore),
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1', {}, initialContext);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('test');
  });

  it('Should allow setting imperative operation Id, using context value, when source is invalid', async () => {
    const initialContext = { request: { body: { operationId: 'persisted_1' } } };
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
          extractOperationId: (context: any) => context.request.body.operationId,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('invalid', {}, initialContext);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('test');
  });

  it('Should allow setting imperative operation Id, using context value, when source valid', async () => {
    const initialContext = { request: { body: { operationId: 'persisted_1' } } };
    const store = new Map([['persisted_1', parse(`query { foo }`)]]);
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
          extractOperationId: (context: any) => context.request.body.operationId,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute(`query { bar }`, {}, initialContext);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('test');
  });

  it('Should execute `onMissingMatch` callback when operation Id is not matched and `onlyPersisted` is true', async () => {
    const initialContext = { storeId: 'custom' };
    const store = new Map();
    const mockOnMissingMatch = jest.fn();
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
          onMissingMatch: mockOnMissingMatch,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1', {}, initialContext);
    assertSingleExecutionValue(result);
    expect(mockOnMissingMatch).toHaveBeenCalledTimes(1);
    expect(mockOnMissingMatch).toHaveBeenCalledWith(initialContext, 'persisted_1');
  });

  it('Should execute `onMissingMatch` callback when operation Id is not matched and `onlyPersisted` is false', async () => {
    const initialContext = { storeId: 'custom' };
    const store = new Map();
    const mockOnMissingMatch = jest.fn();
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: false,
          store,
          onMissingMatch: mockOnMissingMatch,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1', {}, initialContext);
    assertSingleExecutionValue(result);
    expect(mockOnMissingMatch).toHaveBeenCalledTimes(1);
    expect(mockOnMissingMatch).toHaveBeenCalledWith(initialContext, 'persisted_1');
  });

  it('Should not execute `onMissingMatch` callback when operation Id is matched and `onlyPersisted` is true', async () => {
    const store = new Map([['persisted_1', `query { foo }`]]);
    const mockOnMissingMatch = jest.fn();
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: true,
          store,
          onMissingMatch: mockOnMissingMatch,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1');
    assertSingleExecutionValue(result);
    expect(mockOnMissingMatch).not.toHaveBeenCalled();
  });

  it('Should not execute `onMissingMatch` callback when operation Id is matched and `onlyPersisted` is false', async () => {
    const store = new Map([['persisted_1', `query { foo }`]]);
    const mockOnMissingMatch = jest.fn();
    const testInstance = createTestkit(
      [
        usePersistedOperations({
          onlyPersisted: false,
          store,
          onMissingMatch: mockOnMissingMatch,
        }),
      ],
      testSchema,
    );

    const result = await testInstance.execute('persisted_1');
    assertSingleExecutionValue(result);
    expect(mockOnMissingMatch).not.toHaveBeenCalled();
  });
});
