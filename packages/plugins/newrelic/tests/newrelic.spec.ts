import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { TestAgent } from '@newrelic/test-utilities';
import { AttributeName, useNewRelic } from '../src';

describe('New Relic', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello(greetingVerb: String! = "Hello", name: String! = "world!"): String
        foo: Foo
        ignoreMyError: String
      }
      type Foo {
        bar: String
      }
    `,
    resolvers: {
      Query: {
        hello: (_, { greetingVerb, name }) => [greetingVerb, name].join(' '),
        foo: () => ({}),
        ignoreMyError: () => {
          throw new Error('Ignore me!');
        },
      },
      Foo: {
        bar: () => 'bar',
      },
    },
  });
  let helper: any;
  beforeEach(() => {
    helper = TestAgent.makeInstrumented();
  });
  afterEach(() => helper.unload());
  it('base configuration', () => {
    expect.assertions(6);
    return helper.runInTransaction(async (tx: any) => {
      const testKit = createTestkit(
        [
          useNewRelic({
            shim: helper.getShim(),
          }),
        ],
        schema,
      );
      // Do some testing logic...

      // This will check that transaction state hasn't been lost and that the given
      // transaction is the currently active one. A good check to make in the
      // callbacks to asynchronous methods.
      expect(helper.getTransaction()).toBe(tx);

      await testKit.execute(`query Greetings { hello }`);

      expect(tx.nameState.pathStack[0].path).toEqual('query/Greetings');

      expect([...tx.trace.root._spanContext.customAttributes.attributes.keys()]).toStrictEqual([
        AttributeName.EXECUTION_OPERATION_NAME,
        AttributeName.EXECUTION_OPERATION_TYPE,
      ]);
      expect(
        tx.trace.root._spanContext.customAttributes.attributes.get(
          AttributeName.EXECUTION_OPERATION_NAME,
        ).value,
      ).toBe(`Greetings`);
      expect(
        tx.trace.root._spanContext.customAttributes.attributes.get(
          AttributeName.EXECUTION_OPERATION_TYPE,
        ).value,
      ).toBe(`query`);

      // Many metrics are not created until the transaction ends, if you're
      // missing metrics in your instrumentation tests, this may help.
      tx.end();

      // This will check that the metrics given have been created. Extra metrics
      // are allowed.
      expect(
        helper.agent.metrics.getMetric(
          `Supportability/ExternalModules/${AttributeName.COMPONENT_NAME}`,
        ),
      ).toBeTruthy();
    });
  });
  describe('includeExecuteVariables', () => {
    it('true should include all variables', () => {
      expect.assertions(1);
      return helper.runInTransaction(async (tx: any) => {
        const testKit = createTestkit(
          [
            useNewRelic({
              includeExecuteVariables: true,
              shim: helper.getShim(),
            }),
          ],
          schema,
        );

        await testKit.execute(`query Greetings($name: String!) { hello(name: $name) }`, {
          name: 'Laurin',
        });

        expect(
          tx.trace.root._spanContext.customAttributes.attributes.get(
            AttributeName.EXECUTION_VARIABLES,
          ).value,
        ).toBe(`{"name":"Laurin"}`);

        // Many metrics are not created until the transaction ends, if you're
        // missing metrics in your instrumentation tests, this may help.
        tx.end();
      });
    });
    it('RegExp should include only matching variables', () => {
      expect.assertions(1);
      return helper.runInTransaction(async (tx: any) => {
        const testKit = createTestkit(
          [
            useNewRelic({
              includeExecuteVariables: /verb/,
              shim: helper.getShim(),
            }),
          ],
          schema,
        );

        await testKit.execute(
          /* GraphQL */ `
            query Greetings($verb: String!, $name: String!) {
              hello(greetingVerb: $verb, name: $name)
            }
          `,
          {
            verb: 'Hi',
            name: 'Dotan',
          },
        );

        expect(
          tx.trace.root._spanContext.customAttributes.attributes.get(
            AttributeName.EXECUTION_VARIABLES,
          ).value,
        ).toBe(`{"verb":"Hi"}`);

        // Many metrics are not created until the transaction ends, if you're
        // missing metrics in your instrumentation tests, this may help.
        tx.end();
      });
    });
  });
  it('includeRawResult: true', () => {
    expect.assertions(1);
    return helper.runInTransaction(async (tx: any) => {
      const testKit = createTestkit(
        [
          useNewRelic({
            includeRawResult: true,
            shim: helper.getShim(),
          }),
        ],
        schema,
      );
      // Do some testing logic...
      await testKit.execute(`query Greetings { hello }`);

      expect(
        tx.trace.root._spanContext.customAttributes.attributes.get(AttributeName.EXECUTION_RESULT)
          .value,
      ).toBe(`{"data":{"hello":"Hello world!"}}`);

      // Many metrics are not created until the transaction ends, if you're
      // missing metrics in your instrumentation tests, this may help.
      tx.end();
    });
  });
  it('skipError', () => {
    expect.assertions(1);
    return helper.runInTransaction(async (tx: any) => {
      const testKit = createTestkit(
        [
          useNewRelic({
            skipError: e => e.message === 'Ignore me!',
            shim: helper.getShim(),
          }),
        ],
        schema,
      );
      // Do some testing logic...

      await testKit.execute(`query ErrorLog { hello ignoreMyError }`);
      expect(tx.trace.root._spanContext.hasError).toBe(false);

      // Many metrics are not created until the transaction ends, if you're
      // missing metrics in your instrumentation tests, this may help.
      tx.end();
    });
  });
  it('rootFieldsNaming: true', () => {
    expect.assertions(1);
    return helper.runInTransaction(async (tx: any) => {
      const testKit = createTestkit(
        [
          useNewRelic({
            rootFieldsNaming: true,
            shim: helper.getShim(),
          }),
        ],
        schema,
      );
      // Do some testing logic...

      await testKit.execute(`query Greetings { hello }`);

      expect(tx.nameState.pathStack[0].path).toBe('query/Greetings/hello');

      // Many metrics are not created until the transaction ends, if you're
      // missing metrics in your instrumentation tests, this may help.
      tx.end();
    });
  });
});
