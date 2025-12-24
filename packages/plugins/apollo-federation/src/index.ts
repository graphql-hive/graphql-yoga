import {
  DocumentNode,
  ExecutionResult,
  getOperationAST,
  GraphQLSchema,
  OperationDefinitionNode,
  print,
  printSchema,
} from 'graphql';
import { InMemoryLRUCache, type KeyValueCache } from '@apollo/utils.keyvaluecache';
import { getDocumentString, Plugin } from '@envelop/core';
import { CachePolicy, newCachePolicy } from './new-cache-policy.js';

interface GatewayLogger {
  warn(message: unknown): void;
  debug(message: unknown): void;
  info(message: unknown): void;
  error(message: unknown): void;
}

type GatewayExecutor = (args: {
  document: DocumentNode;
  request: {
    query: string;
    operationName?: string;
    variables?: Record<string, any>;
  };
  overallCachePolicy: CachePolicy;
  operationName: string | null;
  cache: KeyValueCache;
  context: Record<string, any>;
  queryHash: string;
  logger: GatewayLogger;
  metrics: any;
  source: string;
  operation: OperationDefinitionNode;
  schema: GraphQLSchema;
  schemaHash: any;
}) => Promise<ExecutionResult>;

interface ApolloFederationGateway {
  schema?: GraphQLSchema;
  executor: GatewayExecutor;
  load(): Promise<{ schema: GraphQLSchema; executor: GatewayExecutor }>;
  onSchemaLoadOrUpdate(
    callback: (args: { apiSchema: GraphQLSchema; coreSupergraphSdl?: string }) => void,
  ): void;
}

export interface ApolloFederationPluginConfig<TFederationGateway extends ApolloFederationGateway> {
  gateway: TFederationGateway;
  metrics?: unknown;
  cache?: KeyValueCache;
  logger?: GatewayLogger;
  overallCachePolicy?: CachePolicy;
}

export const useApolloFederation = <
  TFederationGateway extends ApolloFederationGateway,
  TContext extends Record<string, any>,
>(
  options: ApolloFederationPluginConfig<TFederationGateway>,
): Plugin<TContext> => {
  const {
    gateway,
    cache = new InMemoryLRUCache(),
    logger = console,
    metrics = Object.create(null),
    overallCachePolicy = newCachePolicy(),
  } = options;
  let schemaHash: any;
  return {
    onPluginInit({ setSchema }) {
      if (gateway.schema) {
        setSchema(gateway.schema);
      } else {
        logger.warn(
          `ApolloGateway doesn't have the schema loaded. Please make sure ApolloGateway is loaded with .load() method. Otherwise this plugin might not work consistently, especially if you are using ApolloServer.`,
        );
        gateway.load();
      }
      gateway.onSchemaLoadOrUpdate(({ apiSchema, coreSupergraphSdl = printSchema(apiSchema) }) => {
        setSchema(apiSchema);
        schemaHash = coreSupergraphSdl || printSchema(apiSchema);
      });
    },
    onExecute({ args, setExecuteFn }) {
      const documentStr = getDocumentString(args.document, print);
      const operation = getOperationAST(args.document, args.operationName ?? undefined);
      if (!operation) {
        throw new Error(`Operation ${args.operationName || ''} cannot be found in ${documentStr}`);
      }
      setExecuteFn(function federationExecutor() {
        return gateway.executor({
          document: args.document,
          request: {
            query: documentStr,
            operationName: args.operationName ?? undefined,
            variables: args.variableValues ?? undefined,
          },
          overallCachePolicy,
          operationName: args.operationName ?? null,
          cache,
          context: args.contextValue,
          queryHash: documentStr,
          logger,
          metrics,
          source: documentStr,
          operation,
          schema: args.schema,
          schemaHash,
        });
      });
    },
  };
};
