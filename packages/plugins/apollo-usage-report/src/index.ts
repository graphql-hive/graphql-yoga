import { DocumentNode, getOperationAST, GraphQLSchema, Kind, printSchema } from 'graphql';
import {
  isAsyncIterable,
  YogaLogger,
  YogaServer,
  type FetchAPI,
  type Maybe,
  type Plugin,
  type PromiseOrValue,
  type YogaInitialContext,
} from 'graphql-yoga';
import { Report } from '@apollo/usage-reporting-protobuf';
import {
  calculateReferencedFieldsByType,
  usageReportingSignature,
} from '@apollo/utils.usagereporting';
import {
  ApolloInlineGraphqlTraceContext,
  ApolloInlineRequestTraceContext,
  ApolloInlineTracePluginOptions,
  useApolloInstrumentation,
} from '@graphql-yoga/plugin-apollo-inline-trace';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';

type ApolloUsageReportOptions = ApolloInlineTracePluginOptions & {
  /**
   * The graph ref of the managed federation graph.
   * It is composed of the graph ID and the variant (`<YOUR_GRAPH_ID>@<VARIANT>`).
   *
   * If not provided, `APOLLO_GRAPH_REF` environment variable is used.
   *
   * You can find a a graph's ref at the top of its Schema Reference page in Apollo Studio.
   */
  graphRef?: string;
  /**
   * The API key to use to authenticate with the managed federation up link.
   * It needs at least the `service:read` permission.
   *
   * If not provided, `APOLLO_KEY` environment variable will be used instead.
   *
   * [Learn how to create an API key](https://www.apollographql.com/docs/federation/v1/managed-federation/setup#4-connect-the-gateway-to-studio)
   */
  apiKey?: string;
  /**
   * Usage report endpoint
   *
   * Defaults to GraphOS endpoint (https://usage-reporting.api.apollographql.com/api/ingress/traces)
   */
  endpoint?: string;
  /**
   * Agent Version to report to the usage reporting API
   */
  agentVersion?: string;
  /**
   * Client name to report to the usage reporting API
   */
  clientName?: StringFromRequestFn;
  /**
   * Client version to report to the usage reporting API
   */
  clientVersion?: StringFromRequestFn;
};

export interface ApolloUsageReportRequestContext extends ApolloInlineRequestTraceContext {
  traces: Map<YogaInitialContext, ApolloUsageReportGraphqlContext>;
}

export interface ApolloUsageReportGraphqlContext extends ApolloInlineGraphqlTraceContext {
  referencedFieldsByType: ReturnType<typeof calculateReferencedFieldsByType>;
  operationKey?: string;
  schemaId?: string;
}

function getEnvVar<T>(name: string, defaultValue?: T) {
  return globalThis.process?.env?.[name] || defaultValue || undefined;
}

const DEFAULT_REPORTING_ENDPOINT =
  'https://usage-reporting.api.apollographql.com/api/ingress/traces';

type StringFromRequestFn = (req: Request) => Maybe<string>;

export function useApolloUsageReport(options: ApolloUsageReportOptions = {}): Plugin {
  const [instrumentation, ctxForReq] = useApolloInstrumentation(options) as [
    Plugin,
    WeakMap<Request, ApolloUsageReportRequestContext>,
  ];

  let schemaIdSet$: MaybePromise<void> | undefined;
  let schema: { id: string; schema: GraphQLSchema } | undefined;
  let yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>;
  const logger = Object.fromEntries(
    (['error', 'warn', 'info', 'debug'] as const).map(level => [
      level,
      (...messages: unknown[]) => yoga.logger[level]('[ApolloUsageReport]', ...messages),
    ]),
  ) as YogaLogger;

  let clientNameFactory: StringFromRequestFn = req => req.headers.get('apollographql-client-name');
  if (typeof options.clientName === 'function') {
    clientNameFactory = options.clientName;
  }

  let clientVersionFactory: StringFromRequestFn = req =>
    req.headers.get('apollographql-client-version');
  if (typeof options.clientVersion === 'function') {
    clientVersionFactory = options.clientVersion;
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(instrumentation);
      addPlugin({
        onYogaInit(args) {
          yoga = args.yoga;

          if (!getEnvVar('APOLLO_KEY', options.apiKey)) {
            throw new Error(
              `[ApolloUsageReport] Missing API key. Please provide one in plugin options or with 'APOLLO_KEY' environment variable.`,
            );
          }

          if (!getEnvVar('APOLLO_GRAPH_REF', options.graphRef)) {
            throw new Error(
              `[ApolloUsageReport] Missing Graph Ref. Please provide one in plugin options or with 'APOLLO_GRAPH_REF' environment variable.`,
            );
          }
        },
        onSchemaChange({ schema }) {
          if (schema) {
            schemaIdSet$ = handleMaybePromise(
              () => hashSHA256(printSchema(schema), yoga.fetchAPI),
              id => {
                schema = { id, schema };
                schemaIdSet$ = undefined;
              },
            );
          }
        },

        onRequestParse(): PromiseOrValue<void> {
          return schemaIdSet$;
        },

        onParse() {
          return function onParseEnd({ result, context }) {
            if (!schema) {
              throw new Error("should not happen: schema doesn't exists");
            }
            const ctx = ctxForReq.get(context.request)?.traces.get(context);
            if (!ctx) {
              logger.debug(
                'operation tracing context not found, this operation will not be traced.',
              );
              return;
            }

            const operationName =
              context.params.operationName ??
              (isDocumentNode(result) ? getOperationAST(result)?.name?.value : undefined);
            const signature = operationName
              ? usageReportingSignature(result, operationName)
              : (context.params.query ?? '');

            ctx.referencedFieldsByType = calculateReferencedFieldsByType({
              document: result,
              schema: schema.schema,
              resolvedOperationName: operationName ?? null,
            });
            ctx.operationKey = `# ${operationName || '-'}\n${signature}`;
            ctx.schemaId = schema!.id;
          };
        },

        onResultProcess({ request, result, serverContext }) {
          // TODO: Handle async iterables ?
          if (isAsyncIterable(result)) {
            logger.debug('async iterable results not implemented for now');
            return;
          }

          const reqCtx = ctxForReq.get(request);
          if (!reqCtx) {
            logger.debug('operation tracing context not found, this operation will not be traced.');
            return;
          }

          // Each operation in a batched request can belongs to a different schema.
          // Apollo doesn't allow to send batch queries for multiple schemas in the same batch
          const tracesPerSchema: Record<string, Report['tracesPerQuery']> = {};

          for (const trace of reqCtx.traces.values()) {
            if (!trace.schemaId || !trace.operationKey) {
              logger.debug('Misformed trace, missing operation key or schema id');
              continue;
            }

            const clientName = clientNameFactory(request);
            if (clientName) {
              trace.trace.clientName = clientName;
            }

            const clientVersion = clientVersionFactory(request);
            if (clientVersion) {
              trace.trace.clientVersion = clientVersion;
            }

            tracesPerSchema[trace.schemaId] ||= {};
            tracesPerSchema[trace.schemaId]![trace.operationKey] ||= { trace: [] };
            const stats = tracesPerSchema[trace.schemaId]![trace.operationKey]!;
            stats.trace?.push(trace.trace);
            stats.referencedFieldsByType = trace.referencedFieldsByType;
          }

          for (const schemaId in tracesPerSchema) {
            const tracesPerQuery = tracesPerSchema[schemaId]!;
            const agentVersion = options.agentVersion || `graphql-yoga@${yoga.version}`;
            serverContext.waitUntil(
              sendTrace(options, logger, yoga.fetchAPI, schemaId, tracesPerQuery, agentVersion),
            );
          }
        },
      });
    },
  };
}

export function hashSHA256(
  text: string,
  api: {
    crypto: Crypto;
    TextEncoder: (typeof globalThis)['TextEncoder'];
  } = globalThis,
) {
  const inputUint8Array = new api.TextEncoder().encode(text);
  return handleMaybePromise(
    () => api.crypto.subtle.digest({ name: 'SHA-256' }, inputUint8Array),
    arrayBuf => {
      const outputUint8Array = new Uint8Array(arrayBuf);

      let hash = '';
      for (const byte of outputUint8Array) {
        const hex = byte.toString(16);
        hash += '00'.slice(0, Math.max(0, 2 - hex.length)) + hex;
      }

      return hash;
    },
  );
}

function sendTrace(
  options: ApolloUsageReportOptions,
  logger: YogaLogger,
  { fetch, CompressionStream }: FetchAPI,
  schemaId: string,
  tracesPerQuery: Report['tracesPerQuery'],
  agentVersion: string,
) {
  const {
    graphRef = getEnvVar('APOLLO_GRAPH_REF'),
    apiKey = getEnvVar('APOLLO_KEY'),
    endpoint = DEFAULT_REPORTING_ENDPOINT,
  } = options;

  const report = Report.encode({
    header: {
      agentVersion,
      graphRef,
      executableSchemaId: schemaId,
    },
    operationCount: 1,
    tracesPerQuery,
  }).finish();

  return handleMaybePromise(
    () => {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/protobuf',
          'content-encoding': 'gzip',
          // The presence of the api key is already checked at Yoga initialization time
          'x-api-key': apiKey!,
          accept: 'application/json',
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(report);
            controller.close();
          },
        }).pipeThrough(new CompressionStream('gzip')),
      });
    },
    response =>
      handleMaybePromise(
        () => response.text(),
        responseText => {
          if (response.ok) {
            logger.debug('Traces sent:', responseText);
          } else {
            logger.error('Failed to send trace:', responseText);
          }
        },
      ),
    err => {
      logger.error('Failed to send trace:', err);
    },
  );
}

function isDocumentNode(data: unknown): data is DocumentNode {
  const isObject = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

  return isObject(data) && data['kind'] === Kind.DOCUMENT;
}
