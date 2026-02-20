import { envelop, Plugin, useEngine } from '@envelop/core';

describe('instrumentation', () => {
  it('should instrument all graphql phases', async () => {
    const result: string[] = [];
    const make = (name: string): Plugin => ({
      instrumentation: {
        init: (_, w) => {
          result.push(`pre-init-${name}`);
          expect(w()).toBeUndefined();
          result.push(`post-init-${name}`);
        },
        parse: (_, w) => {
          result.push(`pre-parse-${name}`);
          expect(w()).toBeUndefined();
          result.push(`post-parse-${name}`);
        },
        validate: (_, w) => {
          result.push(`pre-validate-${name}`);
          expect(w()).toBeUndefined();
          result.push(`post-validate-${name}`);
        },
        context: (_, w) => {
          result.push(`pre-context-${name}`);
          expect(w()).toBeUndefined();
          result.push(`post-context-${name}`);
        },
        execute: async (_, w) => {
          result.push(`pre-execute-${name}`);
          expect(await w()).toBeUndefined();
          result.push(`post-execute-${name}`);
        },
        subscribe: async (_, w) => {
          result.push(`pre-subscribe-${name}`);
          expect(await w()).toBeUndefined();
          result.push(`post-subscribe-${name}`);
        },
      },
    });

    const getEnveloped = envelop({
      plugins: [
        useEngine({
          execute: () => {
            result.push('execute');
            return new Promise(r => setTimeout(() => r('test'), 10));
          },
          subscribe: () => {
            result.push('subscribe');
            return new Promise(r => setTimeout(() => r('test'), 10));
          },
          parse: () => {
            result.push('parse');
            return { test: 'foo' };
          },
          validate: () => {
            result.push('validate');
            return 'test';
          },
        }),
        make('1'),
        make('2'),
        make('3'),
      ],
    });

    const gql = getEnveloped({ test: 'foo' });
    expect(gql.parse('')).toEqual({ test: 'foo' });
    expect(gql.validate({}, {})).toEqual('test');
    expect(gql.contextFactory()).toEqual({ test: 'foo' });
    expect(await gql.execute({ document: {}, schema: {} })).toEqual('test');
    expect(await gql.subscribe({ document: {}, schema: {} })).toEqual('test');

    const withPrefix = (prefix: string) => [`${prefix}-1`, `${prefix}-2`, `${prefix}-3`];

    expect(result).toEqual([
      ...withPrefix('pre-init'),
      ...withPrefix('post-init').reverse(),
      ...withPrefix('pre-parse'),
      'parse',
      ...withPrefix('post-parse').reverse(),
      ...withPrefix('pre-validate'),
      'validate',
      ...withPrefix('post-validate').reverse(),
      ...withPrefix('pre-context'),
      ...withPrefix('post-context').reverse(),
      ...withPrefix('pre-execute'),
      'execute',
      ...withPrefix('post-execute').reverse(),
      ...withPrefix('pre-subscribe'),
      'subscribe',
      ...withPrefix('post-subscribe').reverse(),
    ]);
  });
});
