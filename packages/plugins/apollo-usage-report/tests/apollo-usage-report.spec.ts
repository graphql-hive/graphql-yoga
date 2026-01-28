import { createSchema, createYoga, DisposableSymbols } from 'graphql-yoga';
import { Report } from '@apollo/usage-reporting-protobuf';
import {
  ApolloUsageReportOptions,
  useApolloUsageReport,
} from '@graphql-yoga/plugin-apollo-usage-report';
import { createDeferredPromise } from '@whatwg-node/promise-helpers';
import { Reporter } from '../src/reporter';

describe('apollo-usage-report', () => {
  it('should send compressed traces', async () => {
    const testEnv = createTestEnv({ options: { alwaysSend: true } });

    await testEnv.query();

    const report = await testEnv.reportSent;
    const { ['# -\n{hello}']: traces } = report.tracesPerQuery;
    expect(traces).toBeDefined();
    expect(traces?.referencedFieldsByType?.['Query']?.fieldNames).toEqual(['hello']);
    expect(traces?.trace).toHaveLength(1);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should handle operation name when defined', async () => {
    const testEnv = createTestEnv({ options: { alwaysSend: true } });
    await testEnv.query('query test { hello }');

    const report = await testEnv.reportSent;
    expect(report.tracesPerQuery['# test\nquery test{hello}']).toBeDefined();

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should trace unparsable requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true, sendUnexecutableOperationDocuments: true },
    });
    await testEnv.query('this is an invalid request', 'test');

    const report = await testEnv.reportSent;
    expect(Object.keys(report.tracesPerQuery).length).toBe(1);
    const [key, traces] = Object.entries(report.tracesPerQuery)[0]!;
    expect(key).toBe('## GraphQLParseFailure\n');
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);
    expect(traces?.trace?.[0]).toMatchObject({
      unexecutedOperationName: 'test',
      unexecutedOperationBody: 'this is an invalid request',
    });

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should trace invalid requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true, sendUnexecutableOperationDocuments: true },
    });
    await testEnv.query('query test {unknown_field}', 'test');

    const report = await testEnv.reportSent;
    expect(Object.keys(report.tracesPerQuery).length).toBe(1);
    const [key, traces] = Object.entries(report.tracesPerQuery)[0]!;
    expect(key).toBe('## GraphQLValidationFailure\n');
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);
    expect(traces?.trace?.[0]).toMatchObject({
      unexecutedOperationName: 'test',
      unexecutedOperationBody: 'query test {unknown_field}',
    });

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should trace unknown operation requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true, sendUnexecutableOperationDocuments: true },
    });
    await testEnv.query('query test { hello }', 'unknown');

    const report = await testEnv.reportSent;
    expect(Object.keys(report.tracesPerQuery).length).toBe(1);
    const [key, traces] = Object.entries(report.tracesPerQuery)[0]!;
    expect(key).toBe('## GraphQLUnknownOperationName\n');
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);
    expect(traces?.trace?.[0]).toMatchObject({
      unexecutedOperationName: 'unknown',
      unexecutedOperationBody: 'query test { hello }',
    });

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should not trace unparsable requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true },
    });
    await testEnv.query('this is an invalid request');
    await testEnv.query();

    const report = await testEnv.reportSent;
    const { ['# -\n{hello}']: traces } = report.tracesPerQuery;
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should not trace invalid requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true },
    });
    await testEnv.query('{unknown_field}');
    await testEnv.query();

    const report = await testEnv.reportSent;
    const { ['# -\n{hello}']: traces } = report.tracesPerQuery;
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should not trace unknown operation requests', async () => {
    const testEnv = createTestEnv({
      options: { alwaysSend: true },
    });
    await testEnv.query('query test { hello }', 'unknown');
    await testEnv.query();

    const report = await testEnv.reportSent;
    const { ['# -\n{hello}']: traces } = report.tracesPerQuery;
    expect(traces).toBeDefined();
    expect(traces?.trace).toHaveLength(1);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should batch traces and send once maxBatchDelay is reached', async () => {
    const testEnv = createTestEnv({ options: { maxBatchDelay: 500 } });

    const start = performance.now();
    await testEnv.query();
    await testEnv.query();
    const report = await testEnv.reportSent;
    const end = performance.now();
    expect(report.tracesPerQuery['# -\n{hello}']?.trace).toHaveLength(2);

    const elapsed = end - start;
    expect(elapsed).toBeGreaterThan(500);
    expect(elapsed).toBeLessThan(550);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should send traces when size threshold is reached', async () => {
    const testEnv = createTestEnv({
      options: { maxBatchUncompressedSize: 150, maxBatchDelay: 500 },
    });

    const start = performance.now();
    await testEnv.query();
    await testEnv.query();
    const report = await testEnv.reportSent;
    const end = performance.now();

    expect(report.tracesPerQuery['# -\n{hello}']?.trace).toHaveLength(2);
    const elapsed = end - start;
    expect(elapsed).toBeLessThan(500);

    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should wait for all traces to be sent on shutdown', async () => {
    const testEnv = createTestEnv({ options: { maxBatchDelay: 500 } });

    const start = performance.now();
    await testEnv.query();

    await testEnv[DisposableSymbols.asyncDispose]();
    const report = await testEnv.reportSent;
    const end = performance.now();

    expect(report.tracesPerQuery['# -\n{hello}']?.trace).toHaveLength(1);

    const elapsed = end - start;
    expect(elapsed).toBeLessThan(500);
    await testEnv[DisposableSymbols.asyncDispose]();
  });

  it('should not leak trace sending promises', async () => {
    let reporter: Reporter;
    const testEnv = createTestEnv({
      options: {
        alwaysSend: true,
        reporter: (...args) => {
          reporter = new Reporter(...args);
          return reporter;
        },
      },
    });

    await testEnv.query();
    await testEnv.reportSent;
    // @ts-expect-error Accessing a private field
    expect(reporter!.sending).toHaveLength(0);

    await testEnv[DisposableSymbols.asyncDispose]();
  });
});

function createTestEnv(
  options: { graphosFetch?: typeof fetch; options?: ApolloUsageReportOptions } = {},
) {
  const reportSent = createDeferredPromise<Report>();
  const yoga = createYoga({
    schema,
    plugins: [
      useApolloUsageReport({
        graphRef: 'graphref',
        apiKey: 'apikey',
        ...options.options,
      }),
    ],
    maskedErrors: false,
    fetchAPI: {
      fetch: async (url, init) => {
        if (url.toString().includes('usage-reporting.api.apollographql.com')) {
          try {
            const bodyStream = init?.body as ReadableStream;
            const body = await streamToUint8Array(
              bodyStream.pipeThrough(new DecompressionStream('gzip')),
            );
            reportSent.resolve(Report.decode(body));

            return options.graphosFetch
              ? options.graphosFetch(url, init)
              : new Response(null, { status: 200 });
          } catch (err) {
            reportSent.reject(err);
          }
        }
        return fetch(url, init);
      },
    },
  });

  return {
    yoga,
    reportSent: reportSent.promise,
    query: (query = '{ hello }', operationName?: string) => {
      return yoga.fetch('http://yoga/graphql', {
        headers: {
          'Content-Type': 'application/json',
          'apollo-federation-include-trace': 'ftv1',
        },
        method: 'POST',
        body: JSON.stringify({ query, operationName }),
      });
    },
    [DisposableSymbols.asyncDispose]: () => yoga.dispose() as Promise<void>,
  };
}

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
      boom: String!
      person: Person!
      people: [Person!]!
    }
    type Subscription {
      hello: String!
    }
    type Person {
      name: String!
    }
  `,
  resolvers: {
    Query: {
      async hello() {
        return 'world';
      },
      async boom() {
        throw new Error('bam');
      },
      async person() {
        return { name: 'John' };
      },
      async people() {
        return [{ name: 'John' }, { name: 'Jane' }];
      },
    },
    Subscription: {
      hello: {
        async *subscribe() {
          yield { hello: 'world' };
        },
      },
    },
  },
});

async function streamToUint8Array(stream: ReadableStream): Promise<Uint8Array> {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    chunks.push(chunk);
  }

  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
