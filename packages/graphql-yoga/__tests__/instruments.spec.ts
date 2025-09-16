import { createSchema, createYoga, Plugin } from '../src';

describe('instrumentation', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        greetings: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'world',
      },
      Subscription: {
        greetings: {
          async *subscribe() {
            yield { greetings: 'Hi' };
          },
        },
      },
    },
  });

  it('should wrap all the phases with the default composition order', async () => {
    const result: string[] = [];
    const make = (name: string): Plugin => ({
      instrumentation: {
        context: (_, w) => {
          result.push(`pre-context-${name}`);
          w();
          result.push(`post-context-${name}`);
        },
        execute: async (_, w) => {
          result.push(`pre-execute-${name}`);
          await w();
          result.push(`post-execute-${name}`);
        },
        init: (_, w) => {
          result.push(`pre-init-${name}`);
          w();
          result.push(`post-init-${name}`);
        },
        parse: (_, w) => {
          result.push(`pre-parse-${name}`);
          w();
          result.push(`post-parse-${name}`);
        },
        request: async (_, w) => {
          result.push(`pre-request-${name}`);
          await w();
          result.push(`post-request-${name}`);
        },
        subscribe: async (_, w) => {
          result.push(`pre-subscribe-${name}`);
          await w();
          result.push('post-subscribe-${name}');
        },
        validate: (_, w) => {
          result.push(`pre-validate-${name}`);
          w();
          result.push(`post-validate-${name}`);
        },
        operation: async (_, w) => {
          result.push(`pre-operation-${name}`);
          await w();
          result.push(`post-operation-${name}`);
        },
        requestParse: async (_, w) => {
          result.push(`pre-request-parse-${name}`);
          await w();
          result.push(`post-request-parse-${name}`);
        },
        resultProcess: async (_, w) => {
          result.push(`pre-result-process-${name}`);
          await w();
          result.push(`post-result-process-${name}`);
        },
      },
    });

    const yoga = createYoga({
      schema,
      plugins: [make('1'), make('2'), make('3')],
    });

    await yoga.fetch('http://yoga/graphql?query={hello}');

    const withPrefix = (prefix: string) => [`${prefix}-1`, `${prefix}-2`, `${prefix}-3`];
    expect(result).toEqual([
      ...withPrefix('pre-request'),
      ...withPrefix('pre-request-parse'),
      ...withPrefix('post-request-parse').reverse(),
      ...withPrefix('pre-operation'),
      ...withPrefix('pre-init'),
      ...withPrefix('post-init').reverse(),
      ...withPrefix('pre-parse'),
      ...withPrefix('post-parse').reverse(),
      ...withPrefix('pre-validate'),
      ...withPrefix('post-validate').reverse(),
      ...withPrefix('pre-context'),
      ...withPrefix('post-context').reverse(),
      ...withPrefix('pre-execute'),
      ...withPrefix('post-execute').reverse(),
      ...withPrefix('post-operation').reverse(),
      ...withPrefix('pre-result-process'),
      ...withPrefix('post-result-process').reverse(),
      ...withPrefix('post-request').reverse(),
    ]);
  });
});
