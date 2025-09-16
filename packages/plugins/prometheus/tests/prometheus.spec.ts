import { createSchema, createYoga } from 'graphql-yoga';
import { register as registry } from 'prom-client';
import { createHistogram, usePrometheus } from '@graphql-yoga/plugin-prometheus';

describe('Prometheus', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'Hello world!',
      },
    },
  });
  afterEach(() => {
    registry.clear();
  });

  it('should have default configs for the plugin metrics', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          registry,
        }),
      ],
    });
    const result = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test': 'test',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello
          }
        `,
      }),
    });
    await result.text();
    const metrics = await registry.metrics();

    // enabled by default
    expect(metrics).toContain('# TYPE graphql_yoga_http_duration histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_phase_parse histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_phase_validate histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_phase_context histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_phase_execute histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_phase_subscribe histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_request_duration histogram');
    expect(metrics).toContain('# TYPE graphql_envelop_request_time_summary summary');
    expect(metrics).toContain('# TYPE graphql_envelop_error_result counter');
    expect(metrics).toContain('# TYPE graphql_envelop_request counter');
    expect(metrics).toContain('# TYPE graphql_envelop_deprecated_field counter');
    expect(metrics).toContain('# TYPE graphql_envelop_schema_change counter');

    // disabled by default
    expect(metrics).not.toContain('graphql_envelop_execute_resolver');
  });

  it('http flag should work', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          metrics: {
            graphql_yoga_http_duration: true,
          },
          registry,
        }),
      ],
    });
    const result = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test': 'test',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello
          }
        `,
      }),
    });
    await result.text();
    const metrics = await registry.metrics();
    expect(metrics).toContain('graphql_yoga_http_duration_bucket');
    expect(metrics).toContain('operationName="TestProm"');
    expect(metrics).toContain('operationType="query"');
    expect(metrics).toContain('method="POST"');
    expect(metrics).toContain('statusCode="200"');
  });

  it('should allow to skip a request', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          metrics: {
            graphql_yoga_http_duration: createHistogram({
              fillLabelsFn: (params, { request, response }) => ({
                method: request.method,
                statusCode: response.status,
                operationType: params.operationType || 'unknown',
                operationName: params.operationName || 'Anonymous',
                url: request.url,
              }),
              histogram: {
                help: 'test',
                name: 'graphql_yoga_http_duration',
              },
              phases: ['request'],
              registry,
              shouldObserve: () => false,
            }),
          },
          registry,
        }),
      ],
    });
    const result = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test': 'test',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello
          }
        `,
      }),
    });
    await result.text();
    const metrics = await registry.metrics();
    expect(metrics).toContain('graphql_yoga_http_duration_count 0');
  });

  it('labels should be excluded', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          metrics: {
            graphql_yoga_http_duration: true,
          },
          registry,
          labels: {
            operationName: false,
            operationType: false,
          },
        }),
      ],
    });
    const result = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test': 'test',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello
          }
        `,
      }),
    });
    await result.text();
    const metrics = await registry.metrics();
    expect(metrics).toContain('graphql_yoga_http_duration_bucket');
    expect(metrics).not.toContain('operationName="TestProm"');
    expect(metrics).not.toContain('operationType="query"');
    expect(metrics).toContain('method="POST"');
    expect(metrics).toContain('statusCode="200"');
  });

  it('endpoint should work', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          endpoint: '/metrics',
          metrics: {
            graphql_yoga_http_duration: true,
            graphql_envelop_phase_execute: true,
          },
          registry,
        }),
      ],
    });
    const graphqlResult = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello
          }
        `,
      }),
    });
    await graphqlResult.text();
    const result = await yoga.fetch('http://localhost:4000/metrics');
    const metrics = await result.text();
    expect(metrics).toContain('graphql_envelop_phase_execute_bucket');
    expect(metrics).toContain('graphql_yoga_http_duration_bucket');
    expect(metrics).toContain('operationName="TestProm"');
    expect(metrics).toContain('operationType="query"');
    expect(metrics).toContain('method="POST"');
    expect(metrics).toContain('statusCode="200"');
  });

  it('should be able to register the same histogram for multiple different registries', async () => {
    usePrometheus({
      metrics: {
        graphql_yoga_http_duration: true,
      },
      registry,
    });
    usePrometheus({
      metrics: {
        graphql_yoga_http_duration: true,
      },
      registry,
    });
  });

  it('should emit metric with all labels on invalid operations', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        usePrometheus({
          metrics: {
            graphql_yoga_http_duration: true,
          },
          registry,
        }),
      ],
    });
    const result = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql+json',
        Accept: 'application/graphql-response+json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query TestProm {
            hello_DOES_NOT_EXIST
          }
        `,
      }),
    });
    await result.text();
    expect(result.status).toBe(400);
    const metrics = await registry.metrics();
    expect(metrics).toContain('graphql_yoga_http_duration_bucket');
    expect(metrics).toContain('operationType="query"');
    expect(metrics).toContain('method="POST"');
    expect(metrics).toContain('statusCode="400"');
    expect(metrics).toContain('operationName="TestProm"');
  });
});
