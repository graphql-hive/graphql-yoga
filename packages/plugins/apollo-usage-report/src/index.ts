import { DocumentNode, getOperationAST, GraphQLSchema, Kind } from 'graphql';
import {
  isAsyncIterable,
  YogaLogger,
  YogaServer,
  type Maybe,
  type Plugin,
  type PromiseOrValue,
  type YogaInitialContext,
} from 'graphql-yoga';
import {
  calculateReferencedFieldsByType,
  usageReportingSignature,
} from '@apollo/utils.usagereporting';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  ApolloInlineGraphqlTraceContext,
  ApolloInlineRequestTraceContext,
  ApolloInlineTracePluginOptions,
  useApolloInstrumentation,
} from '@graphql-yoga/plugin-apollo-inline-trace';
import { MaybePromise } from '@whatwg-node/promise-helpers';
import { getEnvVar, Reporter } from './reporter.js';

export type ApolloUsageReportOptions = ApolloInlineTracePluginOptions & {
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
  /**
   * The version of the runtime (like 'node v23.7.0')
   * @default empty string.
   */
  runtimeVersion?: string;
  /**
   * The hostname of the machine running this server
   * @default $HOSTNAME environment variable
   */
  hostname?: string;
  /**
   * The OS identification string.
   * The format is `${os.platform()}, ${os.type()}, ${os.release()}, ${os.arch()})`
   * @default empty string
   */
  uname?: string;
  /**
   * The maximum estimated size of each traces in bytes. If the estimated size is higher than this threshold,
   * the complete trace will not be sent and will be reduced to aggregated stats.
   *
   * Note: GraphOS only allow for traces of 10mb maximum
   * @default 10 * 1024 * 1024 (10mb)
   */
  maxTraceSize?: number;
  /**
   * The maximum uncompressed size of a report in bytes.
   * The report will be sent once this threshold is reached, even if the delay between send is not
   * yet expired.
   *
   * @default 4Mb
   */
  maxBatchUncompressedSize?: number;
  /**
   * The maximum time in ms between reports.
   * @default 20s
   */
  maxBatchDelay?: number;
  /**
   * Control if traces should be always sent.
   * If false, the traces will be batched until a delay or size is reached.
   * Note: This is highly not recommended in a production environment
   *
   * @default false
   */
  alwaysSend?: boolean;
  /**
   * Timeout in ms of a trace export tentative
   * @default 30s
   */
  exportTimeout?: number;
  /**
   * The class to be used to keep track of traces and send them to the GraphOS endpoint
   * Note: This option is aimed to be used for testing purposes
   */
  reporter?: (
    options: ApolloUsageReportOptions,
    yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>,
    logger: YogaLogger,
  ) => Reporter;
  /**
   * Called when all retry attempts to send a report to GraphOS endpoint failed.
   * By default, the error is logged.
   */
  onError?: (err: Error) => void;
  /**
   * If false, unexecutable operation (with parsing or validation error) will not be sent
   * @default false
   */
  sendUnexecutableOperationDocuments?: boolean;
};

export interface ApolloUsageReportRequestContext extends ApolloInlineRequestTraceContext {
  traces: Map<YogaInitialContext, ApolloUsageReportGraphqlContext>;
}

export interface ApolloUsageReportGraphqlContext extends ApolloInlineGraphqlTraceContext {
  referencedFieldsByType?: ReturnType<typeof calculateReferencedFieldsByType>;
  operationKey?: string;
  schemaId?: string;
}

type StringFromRequestFn = (req: Request) => Maybe<string>;

export function useApolloUsageReport(options: ApolloUsageReportOptions = {}): Plugin {
  const [instrumentation, ctxForReq] = useApolloInstrumentation(options) as [
    Plugin,
    WeakMap<Request, ApolloUsageReportRequestContext>,
  ];

  const makeReporter = options.reporter ?? ((...args) => new Reporter(...args));

  let schemaIdSet$: MaybePromise<void> | undefined;
  let currentSchema: { id: string; schema: GraphQLSchema } | undefined;
  let yoga: YogaServer<Record<string, unknown>, Record<string, unknown>>;
  let reporter: Reporter;

  const setCurrentSchema = async (schema: GraphQLSchema) => {
    try {
      currentSchema = {
        id: await hashSHA256(printSchemaWithDirectives(schema), yoga.fetchAPI),
        schema,
      };
    } catch (error) {
      logger.error('Failed to calculate schema hash: ', error);
    }

    // We don't want to block server start even if we failed to compute schema id
    schemaIdSet$ = undefined;
  };

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
          reporter = makeReporter(options, yoga, logger);

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

          if (!schemaIdSet$ && !currentSchema) {
            // When the schema is static, the `onSchemaChange` hook is called before initialization
            // We have to handle schema loading here in this case.
            const { schema } = yoga.getEnveloped();
            if (schema) {
              schemaIdSet$ = setCurrentSchema(schema);
            }
          }
        },

        onSchemaChange({ schema }) {
          // When the schema is static, this hook is called before yoga initialization
          // Since we need yoga.fetchAPI for id calculation, we need to wait for Yoga init

          if (schema && yoga) {
            schemaIdSet$ = setCurrentSchema(schema);
          }
        },

        onRequestParse(): PromiseOrValue<void> {
          return schemaIdSet$;
        },

        onParse() {
          return function onParseEnd({ result, context }) {
            const ctx = ctxForReq.get(context.request)?.traces.get(context);
            if (!ctx) {
              logger.debug(
                'operation tracing context not found, this operation will not be traced.',
              );
              return;
            }

            ctx.schemaId = currentSchema!.id;

            if (isDocumentNode(result)) {
              if (getOperationAST(result, context.params.operationName)) {
                return;
              }
              ctx.operationKey = `## GraphQLUnknownOperationName\n`;
            } else {
              ctx.operationKey = '## GraphQLParseFailure\n';
            }

            if (!options.sendUnexecutableOperationDocuments) {
              // To make sure the trace will not be sent, remove request's tracing context
              ctxForReq.delete(context.request);
              return;
            }

            ctx.trace.unexecutedOperationName = context.params.operationName || '';
            ctx.trace.unexecutedOperationBody = context.params.query || '';
          };
        },

        onValidate({ params: { documentAST: document } }) {
          return ({ valid, context }) => {
            const ctx = ctxForReq.get(context.request)?.traces.get(context);
            if (!ctx) {
              logger.debug(
                'operation tracing context not found, this operation will not be traced.',
              );
              return;
            }

            if (valid) {
              if (!currentSchema) {
                throw new Error("should not happen: schema doesn't exists");
              }
              const opName = getOperationAST(document, context.params.operationName)?.name?.value;
              ctx.referencedFieldsByType = calculateReferencedFieldsByType({
                document,
                schema: currentSchema.schema,
                resolvedOperationName: opName ?? null,
              });
              ctx.operationKey = `# ${opName || '-'}\n${usageReportingSignature(document, opName ?? '')}`;
            } else if (options.sendUnexecutableOperationDocuments) {
              ctx.operationKey = '## GraphQLValidationFailure\n';
              ctx.trace.unexecutedOperationName = context.params.operationName ?? '';
              ctx.trace.unexecutedOperationBody = context.params.query ?? '';
            } else {
              // To make sure the trace will not be sent, remove request's tracing context
              ctxForReq.delete(context.request);
            }
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

            serverContext.waitUntil(
              reporter.addTrace(currentSchema!.id, {
                statsReportKey: trace.operationKey,
                trace: trace.trace,
                referencedFieldsByType: trace.referencedFieldsByType ?? {},
                asTrace: true, // TODO: allow to not always send traces
                nonFtv1ErrorPaths: [],
                maxTraceBytes: options.maxTraceSize,
              }),
            );
          }
        },
        async onDispose() {
          await reporter?.flush();
        },
      });
    },
  };
}

export async function hashSHA256(
  text: string,
  api: {
    crypto: Crypto;
    TextEncoder: (typeof globalThis)['TextEncoder'];
  } = globalThis,
) {
  const inputUint8Array = new api.TextEncoder().encode(text);
  const arrayBuf = await api.crypto.subtle.digest({ name: 'SHA-256' }, inputUint8Array);
  const outputUint8Array = new Uint8Array(arrayBuf);

  let hash = '';
  for (const byte of outputUint8Array) {
    const hex = byte.toString(16);
    hash += '00'.slice(0, Math.max(0, 2 - hex.length)) + hex;
  }

  return hash;
}

function isDocumentNode(data: unknown): data is DocumentNode {
  const isObject = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

  return isObject(data) && data['kind'] === Kind.DOCUMENT;
}
