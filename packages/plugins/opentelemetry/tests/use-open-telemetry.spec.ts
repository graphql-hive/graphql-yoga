import { buildSchema, GraphQLError } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import * as opentelemetry from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { Repeater } from '@repeaterjs/repeater';
import { AttributeName, TracingOptions, useOpenTelemetry } from '../src/index.js';

function createTraceProvider(exporter: InMemorySpanExporter) {
  const provider = new BasicTracerProvider();
  const processor = new SimpleSpanProcessor(exporter);
  provider.addSpanProcessor(processor);
  provider.register();
  return provider;
}

const contextManager = new AsyncLocalStorageContextManager().enable();
opentelemetry.context.setGlobalContextManager(contextManager);

describe('useOpenTelemetry', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        ping: String
        echo(message: String): String
        error: String
        context: String
        obj: Obj
      }

      type Obj {
        field1: String!
      }

      type Subscription {
        counter(count: Int!): Int!
      }
    `,
    resolvers: {
      Query: {
        ping: () => {
          return 'pong';
        },
        echo: (_, { message }) => {
          return `echo: ${message}`;
        },
        error: () => {
          throw new GraphQLError('boom');
        },
        obj: () => ({
          field1: 'field1',
        }),
      },
      Subscription: {
        counter: {
          subscribe: (_, args) => {
            return new Repeater((push, end) => {
              for (let i = args.count; i >= 0; i--) {
                push({ counter: i });
              }
              end();
            });
          },
        },
      },
    },
  });

  const useTestOpenTelemetry = (
    exporter?: InMemorySpanExporter,
    options?: TracingOptions,
    spanPrefix?: string,
  ) =>
    useOpenTelemetry(
      {
        resolvers: false,
        result: false,
        variables: false,
        ...(options ?? {}),
      },
      exporter ? createTraceProvider(exporter) : undefined,
      undefined,
      undefined,
      undefined,
      spanPrefix,
    );

  const pingQuery = /* GraphQL */ `
    query {
      ping
    }
  `;

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema,
    );

    const result = await testInstance.execute(pingQuery);
    assertSingleExecutionValue(result);
    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
  });

  it('Should add execution span', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    await testInstance.execute(pingQuery);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('query.anonymous');
  });

  it('Should add resolver span if requested', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { resolvers: true })],
      schema,
    );

    await testInstance.execute(pingQuery);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(2);
    expect(actual[0].name).toBe('Query.ping');
    expect(actual[1].name).toBe('query.anonymous');
  });

  it('Should add default resolver spans if enabled / unspecified', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { resolvers: true })],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query {
        obj {
          field1
        }
      }
    `);

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(3);
    expect(actual[0].name).toBe('Query.obj');
    expect(actual[1].name).toBe('Obj.field1');
    expect(actual[2].name).toBe('query.anonymous');
  });

  it('Should not add default resolver spans if disabled', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { resolvers: true, defaultResolvers: false })],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query {
        obj {
          field1
        }
      }
    `);

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(2);
    expect(actual[0].name).toBe('Query.obj');
    expect(actual[1].name).toBe('query.anonymous');
  });

  it('query should add trace_id to extensions', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { traceIdInResult: 'trace_id' })],
      schema,
    );

    const result = await testInstance.execute(pingQuery);
    assertSingleValue(result);
    expect(result.extensions.trace_id).toBeTruthy();
  });

  it('execute span should use the operation name', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    await testInstance.execute(/* GraphQL */ `
      query ping {
        ping
      }
    `);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('query.ping');
  });

  it('can exclude operation by using list of strings', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(exporter, {
          excludedOperationNames: ['ping'],
        }),
      ],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query ping {
        ping
      }
    `);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(0);
  });

  it('can exclude anonymous operations with fn', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(exporter, {
          excludedOperationNames: name => name === undefined,
        }),
      ],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query {
        ping
      }
    `);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(0);
  });

  it('can exclude anonymous operations with fn', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(exporter, {
          excludedOperationNames: name => name !== undefined && name.startsWith('pi'),
        }),
      ],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query ping {
        ping
      }
    `);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(0);
  });

  it('execute span should add attributes', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    const queryStr = /* GraphQL */ `
      query echo($message: String!) {
        echo(message: $message)
      }
    `;

    const resp = await testInstance.execute(queryStr, {
      message: 'hello',
    });

    assertSingleValue(resp);
    expect(resp.data).toEqual({ echo: 'echo: hello' });

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_DOCUMENT]: queryStr,
      [AttributeName.EXECUTION_OPERATION_NAME]: 'echo',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'query',
    });
  });

  it('execute span should not add attribute if has inline variable', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { variables: false })],
      schema,
    );

    const queryStr = /* GraphQL */ `
      query echo {
        echo(message: "hello")
      }
    `;

    const resp = await testInstance.execute(queryStr);

    assertSingleValue(resp);
    expect(resp.data).toEqual({ echo: 'echo: hello' });

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_NAME]: 'echo',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'query',
    });
  });

  it('custom variables attributes with fn', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(exporter, {
          variables: v => {
            if (v && typeof v === 'object' && 'selector' in v) {
              return JSON.stringify(v.selector);
            }

            return '';
          },
        }),
      ],
      schema,
    );

    const queryStr = /* GraphQL */ `
      query echo($testVar: String!, $testVar2: String!, $selector: String!) {
        echo1: echo(message: $testVar)
        echo2: echo(message: $testVar2)
        echo3: echo(message: $selector)
      }
    `;

    const resp = await testInstance.execute(queryStr, {
      testVar: 'hello',
      testVar2: 'world',
      selector: '1',
    });

    assertSingleValue(resp);

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_DOCUMENT]: `
      query echo($testVar: String!, $testVar2: String!, $selector: String!) {
        echo1: echo(message: $testVar)
        echo2: echo(message: $testVar2)
        echo3: echo(message: $selector)
      }
    `,
      [AttributeName.EXECUTION_OPERATION_NAME]: 'echo',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'query',
      [AttributeName.EXECUTION_VARIABLES]: '"1"',
    });
  });

  it('span should not add document attribute if options false', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { document: false })],
      schema,
    );

    const queryStr = /* GraphQL */ `
      query echo($message: String!) {
        echo(message: $message)
      }
    `;

    const resp = await testInstance.execute(queryStr, {
      message: 'hello',
    });

    assertSingleValue(resp);
    expect(resp.data).toEqual({ echo: 'echo: hello' });

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_NAME]: 'echo',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'query',
    });
  });

  it('span should include error attribute', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    const queryStr = /* GraphQL */ `
      query error {
        error
      }
    `;

    const resp = await testInstance.execute(queryStr);

    assertSingleValue(resp);
    expect(resp.errors).toBeTruthy();

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_DOCUMENT]: queryStr,
      [AttributeName.EXECUTION_OPERATION_NAME]: 'error',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'query',
    });
    expect(actual[0].status.code).toEqual(SpanStatusCode.ERROR);
  });

  it('should add subscription span', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    const queryStr = /* GraphQL */ `
      subscription counter($count: Int!) {
        counter(count: $count)
      }
    `;

    const resp = await testInstance.execute(queryStr, {
      count: 5,
    });

    assertAsyncIterable(resp);

    let expected = 5;
    for await (const value of resp) {
      expect(value.data?.counter).toBe(expected); // ensure subscription works
      expected--;
    }

    await setTimeout$(100); // allow the server some grace to close the graphql.request span after the response finishes

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('subscription.counter');
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_DOCUMENT]: queryStr,
      [AttributeName.EXECUTION_OPERATION_NAME]: 'counter',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'subscription',
    });
  });

  it('should not add subscription span if inline', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    const queryStr = /* GraphQL */ `
      subscription {
        counter(count: 5)
      }
    `;

    const resp = await testInstance.execute(queryStr);

    assertAsyncIterable(resp);

    let expected = 5;
    for await (const value of resp) {
      expect(value.data?.counter).toBe(expected); // ensure subscription works
      expected--;
    }

    await setTimeout$(100); // allow the server some grace to close the graphql.request span after the response finishes

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('subscription.anonymous');
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_NAME]: 'anonymous',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'subscription',
    });
  });

  it('subscription should add trace_id to extensions', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit(
      [useTestOpenTelemetry(exporter, { traceIdInResult: 'trace_id' })],
      schema,
    );

    const queryStr = /* GraphQL */ `
      subscription counter($count: Int!) {
        counter(count: $count)
      }
    `;

    const resp = await testInstance.execute(queryStr, {
      count: 5,
    });

    assertAsyncIterable(resp);

    let expected = 5;
    for await (const value of resp) {
      expect(value.data?.counter).toBe(expected); // ensure subscription works
      expect(value.extensions).toHaveProperty('trace_id');
      expected--;
    }

    await setTimeout$(100); // allow the server some grace to close the graphql.request span after the response finishes

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('subscription.counter');
    expect(actual[0].attributes).toEqual({
      [AttributeName.EXECUTION_OPERATION_DOCUMENT]: queryStr,
      [AttributeName.EXECUTION_OPERATION_NAME]: 'counter',
      [AttributeName.EXECUTION_OPERATION_TYPE]: 'subscription',
    });
  });

  it('adds spanPrefix to span name', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter, {}, 'my-prefix.')], schema);

    const queryStr = /* GraphQL */ `
      query ping {
        ping
      }
    `;

    await testInstance.execute(queryStr);

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('my-prefix.query.ping');
  });
});

function assertSingleValue(
  result: any,
): asserts result is { data: any; extensions: any; errors: any[] } {
  expect(result).toHaveProperty('data');
  expect(result.data).not.toBeNull();
  expect(result.data).not.toBeUndefined();
}

function assertAsyncIterable<T>(value: any): asserts value is AsyncIterable<T> {
  expect(value[Symbol.asyncIterator]).toBeInstanceOf(Function);
}

function setTimeout$(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
