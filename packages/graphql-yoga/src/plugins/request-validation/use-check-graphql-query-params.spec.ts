import { assertInvalidParams, checkGraphQLQueryParams } from './use-check-graphql-query-params.js';

describe('checkGraphQLQueryParams', () => {
  it('accepts string, null, or undefined operationName', () => {
    expect(checkGraphQLQueryParams({ query: '{ __typename }' })).toEqual({
      query: '{ __typename }',
    });
    expect(checkGraphQLQueryParams({ query: '{ __typename }', operationName: undefined })).toEqual({
      query: '{ __typename }',
      operationName: undefined,
    });
    expect(checkGraphQLQueryParams({ query: '{ __typename }', operationName: null })).toEqual({
      query: '{ __typename }',
      operationName: null,
    });
    expect(checkGraphQLQueryParams({ query: '{ __typename }', operationName: 'TestOp' })).toEqual({
      query: '{ __typename }',
      operationName: 'TestOp',
    });
  });

  it('rejects non-string operationName with a 400 GraphQLError', () => {
    for (const [operationName, expectedType] of [
      [123, 'number'],
      [true, 'boolean'],
      [{}, 'object'],
      [['Op'], 'array'],
    ] as const) {
      expect(() => checkGraphQLQueryParams({ query: '{ __typename }', operationName })).toThrow(
        `Expected "operationName" param to be empty or a string, but given ${expectedType}.`,
      );
    }
  });

  it('rejects arrays in assertInvalidParams', () => {
    expect(() => assertInvalidParams([])).toThrow('Invalid "params" in the request body');
  });
});
