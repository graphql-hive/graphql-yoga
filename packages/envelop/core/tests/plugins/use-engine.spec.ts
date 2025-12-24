import { parse, validate } from 'graphql';
import { useEngine } from '@envelop/core';
import { createTestkit } from '@envelop/testing';
import { query, schema, subscriptionOperationString } from '../common.js';

describe('useEngine', () => {
  it('should invoke custom execute', async () => {
    const custom = jest.fn();
    const testInstance = createTestkit([useEngine({ execute: custom })], schema);
    await testInstance.execute(query);
    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('should invoke custom subscribe', async () => {
    const custom = jest.fn();
    const testInstance = createTestkit([useEngine({ subscribe: custom })], schema);
    await testInstance.execute(subscriptionOperationString);
    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('should invoke custom validate', async () => {
    const custom = jest.fn(validate);
    const testInstance = createTestkit([useEngine({ validate: custom })], schema);
    await testInstance.execute(query);
    expect(custom).toHaveBeenCalledTimes(1);
  });

  it('should invoke custom parse', async () => {
    const custom = jest.fn(parse);
    const testInstance = createTestkit([useEngine({ parse: custom })], schema);
    await testInstance.execute(query);
    expect(custom).toHaveBeenCalledTimes(1);
  });
});
