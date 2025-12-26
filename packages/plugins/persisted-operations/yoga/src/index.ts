import { ASTNode, DocumentNode, GraphQLErrorExtensions, Source } from 'graphql';
import {
  createGraphQLError,
  type GraphQLParams,
  type Maybe,
  type OnParamsEventPayload,
  type Plugin,
  type PromiseOrValue,
} from 'graphql-yoga';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

// GraphQLErrorOptions interface does not exist in graphql-js v15
export interface GraphQLErrorOptions {
  nodes?: ReadonlyArray<ASTNode> | ASTNode | null | undefined;
  source?: Maybe<Source>;
  positions?: Maybe<ReadonlyArray<number>>;
  path?: Maybe<ReadonlyArray<string | number>>;
  originalError?: Maybe<Error & { readonly extensions?: unknown }>;
  extensions?: Maybe<GraphQLErrorExtensions>;
}

export type ExtractPersistedOperationId<TPluginContext = Record<string, unknown>> = (
  params: GraphQLParams,
  request: Request,
  context: TPluginContext,
) => null | string;

export const defaultExtractPersistedOperationId: ExtractPersistedOperationId = (
  params: GraphQLParams,
): null | string => {
  if (
    params.extensions != null &&
    typeof params.extensions === 'object' &&
    params.extensions?.['persistedQuery'] != null &&
    typeof params.extensions?.['persistedQuery'] === 'object' &&
    params.extensions?.['persistedQuery']?.['version'] === 1 &&
    typeof params.extensions?.['persistedQuery']?.['sha256Hash'] === 'string'
  ) {
    return params.extensions?.['persistedQuery']?.['sha256Hash'];
  }
  return null;
};

type AllowArbitraryOperationsHandler = (request: Request) => PromiseOrValue<boolean>;

export type UsePersistedOperationsOptions<TPluginContext = Record<string, unknown>> = {
  /**
   * A function that fetches the persisted operation
   */
  getPersistedOperation(
    key: string,
    request: Request,
    context: TPluginContext,
  ): PromiseOrValue<DocumentNode | string | null>;
  /**
   * Whether to allow execution of arbitrary GraphQL operations aside from persisted operations.
   */
  allowArbitraryOperations?: boolean | AllowArbitraryOperationsHandler;
  /**
   * The path to the persisted operation id
   */
  extractPersistedOperationId?: ExtractPersistedOperationId;

  /**
   * Whether to skip validation of the persisted operation
   */
  skipDocumentValidation?: boolean;

  /**
   * Custom errors to be thrown
   */
  customErrors?: CustomPersistedQueryErrors;
};

export type CustomErrorFactory =
  | string
  | (GraphQLErrorOptions & { message: string })
  | ((payload: OnParamsEventPayload) => Error);

export type CustomPersistedQueryErrors = {
  /**
   * Error to be thrown when the persisted operation is not found
   */
  notFound?: CustomErrorFactory;

  /**
   * Error to be thrown when rejecting non-persisted operations
   */
  persistedQueryOnly?: CustomErrorFactory;

  /**
   * Error to be thrown when the extraction of the persisted operation id failed
   */
  keyNotFound?: CustomErrorFactory;
};

export function usePersistedOperations<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TPluginContext extends Record<string, any>,
>({
  allowArbitraryOperations = false,
  extractPersistedOperationId = defaultExtractPersistedOperationId,
  getPersistedOperation,
  skipDocumentValidation = false,
  customErrors,
}: UsePersistedOperationsOptions<TPluginContext>): Plugin<TPluginContext> {
  const operationASTByCtx = new WeakMap<Record<string, unknown>, DocumentNode>();
  const persistedOperationCtx = new WeakSet<Record<string, unknown>>();

  const notFoundErrorFactory = createErrorFactory(
    'PersistedQueryNotFound',
    customErrors?.notFound || {
      message: 'PersistedQueryNotFound',
      extensions: {
        code: 'PERSISTED_QUERY_NOT_IN_LIST',
      },
    },
  );
  const keyNotFoundErrorFactory = createErrorFactory(
    'PersistedQueryKeyNotFound',
    customErrors?.keyNotFound || {
      message: 'PersistedQueryKeyNotFound',
      extensions: {
        code: 'PERSISTED_QUERY_ID_REQUIRED',
      },
    },
  );
  const persistentQueryOnlyErrorFactory = createErrorFactory(
    'PersistedQueryOnly',
    customErrors?.persistedQueryOnly || {
      message: 'PersistedQueryOnly',
      extensions: {
        code: 'CANNOT_SEND_PQ_ID_AND_BODY',
      },
    },
  );

  return {
    onParams(payload) {
      const { request, params, setParams, context } = payload;

      if (params.query) {
        if (allowArbitraryOperations === false) {
          throw persistentQueryOnlyErrorFactory(payload);
        }
        if (typeof allowArbitraryOperations === 'function') {
          return handleMaybePromise(
            () => allowArbitraryOperations(request),
            result => {
              if (!result) {
                throw persistentQueryOnlyErrorFactory(payload);
              }
            },
          );
        }
        return;
      }

      const persistedOperationKey = extractPersistedOperationId(params, request, payload.context);

      if (persistedOperationKey == null) {
        throw keyNotFoundErrorFactory(payload);
      }

      return handleMaybePromise(
        () =>
          getPersistedOperation(persistedOperationKey, request, payload.context as TPluginContext),
        persistedOperation => {
          if (persistedOperation == null) {
            throw notFoundErrorFactory(payload);
          }

          if (typeof persistedOperation === 'object') {
            if (persistedOperation.kind !== 'Document') {
              throw new Error('Persisted operation object is not a valid DocumentNode');
            }
            setParams({
              query: `__PERSISTED_OPERATION_${persistedOperationKey}__`,
              operationName: params.operationName,
              variables: params.variables,
              extensions: params.extensions,
            });
            operationASTByCtx.set(context, persistedOperation);
          } else {
            setParams({
              query: persistedOperation,
              operationName: params.operationName,
              variables: params.variables,
              extensions: params.extensions,
            });
          }
          persistedOperationCtx.add(context);
        },
      );
    },
    onParse({ setParsedDocument, context }) {
      const ast = operationASTByCtx.get(context);
      if (ast) {
        setParsedDocument(ast);
      }
    },
    onValidate({ setResult, context }) {
      if (skipDocumentValidation && persistedOperationCtx.has(context)) {
        setResult([]); // skip validation
      }
    },
  };
}

function createErrorFactory(defaultMessage: string, options?: CustomErrorFactory) {
  if (typeof options === 'string') {
    return () => createGraphQLError(options);
  }

  if (typeof options === 'function') {
    return options;
  }

  return () => {
    return createGraphQLError(options?.message ?? defaultMessage, options);
  };
}
