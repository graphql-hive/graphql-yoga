import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { Client, createClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { createSchema, createYoga } from 'graphql-yoga';
import { register as registry } from 'prom-client';
import WebSocket, { WebSocketServer } from 'ws';
import { usePrometheus } from '../src';

describe('GraphQL WS & Prometheus integration', () => {
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
  let client: Client | undefined;
  let server: Server | undefined;
  afterEach(async () => {
    registry.clear();
    if (client) {
      await client.dispose();
    }
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close(err => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
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
    server = createServer(yoga);
    await new Promise<void>((resolve, reject) => {
      server?.listen(0, () => {
        resolve();
      });
      server?.once('error', reject);
    });
    const wss = new WebSocketServer({
      server,
      path: yoga.graphqlEndpoint,
    });

    useServer(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: (args: any) => args.execute(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.subscribe(args),
        onSubscribe: async (ctx, _id, params) => {
          const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped(
            {
              ...ctx,
              req: ctx.extra.request,
              socket: ctx.extra.socket,
              params,
            },
          );

          const args = {
            schema,
            operationName: params.operationName,
            document: parse(params.query),
            variableValues: params.variables,
            contextValue: await contextFactory(),
            execute,
            subscribe,
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
        },
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Typings are incorrect
      wss,
    );

    const port = (server.address() as AddressInfo).port;

    const client = createClient({
      url: `ws://localhost:${port}${yoga.graphqlEndpoint}`,
      webSocketImpl: WebSocket,
    });

    const iterable = client.iterate({
      query: /* GraphQL */ `
        query Test {
          hello
        }
      `,
    });

    for await (const result of iterable) {
      expect(result.data).toEqual({ hello: 'Hello world!' });
    }

    const metrics = await registry.metrics();

    // enabled by default
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
});
