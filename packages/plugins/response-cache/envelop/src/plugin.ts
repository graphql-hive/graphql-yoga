import jsonStableStringify from 'fast-json-stable-stringify';
import {
  getOperationAST,
  isListType,
  isNonNullType,
  isUnionType,
  Kind,
  print,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  type ASTVisitor,
  type DocumentNode,
  type ExecutionArgs,
  type GraphQLDirective,
  type GraphQLType,
} from 'graphql';
import {
  getDocumentString,
  isAsyncIterable,
  type ExecutionResult,
  type Maybe,
  type ObjMap,
  type OnExecuteDoneHookResult,
  type OnExecuteHookResult,
  type Plugin,
} from '@envelop/core';
import {
  getDirective,
  MapperKind,
  mapSchema,
  memoize1,
  memoize4,
  mergeIncrementalResult,
} from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import type { Cache, CacheEntityRecord } from './cache.js';
import { hashSHA256 } from './hash-sha256.js';
import { createInMemoryCache } from './in-memory-cache.js';

/**
 * Function for building the response cache key based on the input parameters
 */
export type BuildResponseCacheKeyFunction = (params: {
  /** Raw document string as sent from the client. */
  documentString: string;
  /** Variable values as sent form the client. */
  variableValues: ExecutionArgs['variableValues'];
  /** The name of the GraphQL operation that should be executed from within the document. */
  operationName?: Maybe<string>;
  /** optional sessionId for make unique cache keys based on the session.  */
  sessionId: Maybe<string>;
  /** GraphQL Context */
  context: ExecutionArgs['contextValue'];
}) => MaybePromise<string>;

export type GetDocumentStringFunction = (executionArgs: ExecutionArgs) => string;

export type ShouldCacheResultFunction = (params: {
  cacheKey: string;
  result: ExecutionResult;
}) => boolean;

export type UseResponseCacheParameter<PluginContext extends Record<string, any> = {}> = {
  cache?: Cache | ((ctx: Record<string, any>) => Cache);
  /**
   * Maximum age in ms. Defaults to `Infinity`. Set it to 0 for disabling the global TTL.
   */
  ttl?: number;
  /**
   * @deprecated Use `ttlPerSchemaCoordinate` instead.
   */
  ttlPerType?: Record<string, number>;
  /**
   * Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
   * Useful if the selection of a specific field should reduce the TTL of the query operation.
   *
   * The default value is `{}` and it will be merged with a `{ 'Query.__schema': 0 }` object.
   * In the unusual case where you actually want to cache introspection query operations,
   * you need to provide the value `{ 'Query.__schema': undefined }`.
   */
  ttlPerSchemaCoordinate?: Record<string, number | undefined>;
  scopePerSchemaCoordinate?: Record<string, 'PRIVATE' | 'PUBLIC' | undefined>;
  /**
   * Allows to cache responses based on the resolved session id.
   * Return a unique value for each session.
   * Return `null` or `undefined` to mark the session as public/global.
   * Creates a global session by default.
   * @param context GraphQL Context
   *
   * **Global Example:**
   * ```ts
   * useResponseCache({
   *   session: () => null,
   * });
   * ```
   *
   * **User Specific with global fallback example:**
   * ```ts
   * useResponseCache({
   *   session: (context) => context.user?.id ?? null,
   * });
   * ```
   */
  session(context: PluginContext): string | undefined | null;
  /**
   * Specify whether the cache should be used based on the context.
   * By default any request uses the cache.
   */
  enabled?(context: PluginContext): boolean;
  /**
   * Skip caching of following the types.
   */
  ignoredTypes?: string[];
  /**
   * List of fields that are used to identify a entity.
   * Defaults to `["id"]`
   */
  idFields?: Array<string>;
  /**
   * Whether the mutation execution result should be used for invalidating resources.
   * Defaults to `true`
   */
  invalidateViaMutation?: boolean;
  /**
   * Customize the behavior how the response cache key is computed from the document, variable values and sessionId.
   * Defaults to `defaultBuildResponseCacheKey`
   */
  buildResponseCacheKey?: BuildResponseCacheKeyFunction;
  /**
   * Function used for reading the document string that is used for building the response cache key from the execution arguments.
   * By default, the useResponseCache plugin hooks into onParse and caches the original operation string in a WeakMap.
   * If you are hard overriding parse you need to set this function, otherwise responses will not be cached or served from the cache.
   * Defaults to `defaultGetDocumentString`
   *
   */
  getDocumentString?: GetDocumentStringFunction;
  /**
   * Include extension values that provide useful information, such as whether the cache was hit or which resources a mutation invalidated.
   * Defaults to `true` if `process.env["NODE_ENV"]` is set to `"development"`, otherwise `false`.
   */
  includeExtensionMetadata?: boolean;
  /**
   * Checks if the execution result should be cached or ignored. By default, any execution that
   * raises any error is ignored.
   * Use this function to customize the behavior, such as caching results that have an EnvelopError.
   */
  shouldCacheResult?: ShouldCacheResultFunction;
  /**
   * Hook that when TTL is calculated, allows to modify the TTL value.
   */
  onTtl?: ResponseCacheOnTtlFunction<PluginContext>;
};

export type ResponseCacheOnTtlFunction<PluginContext> = (payload: {
  ttl: number;
  context: PluginContext;
}) => number;

/**
 * Default function used for building the response cache key.
 * It is exported here for advanced use-cases. E.g. if you want to short circuit and serve responses from the cache on a global level in order to completely by-pass the GraphQL flow.
 */
export const defaultBuildResponseCacheKey = (params: {
  documentString: string;
  variableValues: ExecutionArgs['variableValues'];
  operationName?: Maybe<string>;
  sessionId: Maybe<string>;
}): MaybePromise<string> =>
  hashSHA256(
    [
      params.documentString,
      params.operationName ?? '',
      jsonStableStringify(params.variableValues ?? {}),
      params.sessionId ?? '',
    ].join('|'),
  );

/**
 * Default function used to check if the result should be cached.
 *
 * It is exported here for advanced use-cases. E.g. if you want to choose if
 * results with certain error types should be cached.
 *
 * By default, results with errors (unexpected, EnvelopError, or GraphQLError) are not cached.
 */
export const defaultShouldCacheResult: ShouldCacheResultFunction = (params): boolean => {
  if (params.result.errors) {
    // eslint-disable-next-line no-console
    console.warn('[useResponseCache] Failed to cache due to errors');
    return false;
  }

  return true;
};

export function defaultGetDocumentString(executionArgs: ExecutionArgs): string {
  return getDocumentString(executionArgs.document, print);
}

export type ResponseCacheExtensions =
  | {
      hit: true;
    }
  | {
      hit: false;
      didCache: false;
    }
  | {
      hit: false;
      didCache: true;
      ttl: number;
    }
  | {
      invalidatedEntities: CacheEntityRecord[];
    };

export type ResponseCacheExecutionResult = ExecutionResult<
  ObjMap<unknown>,
  { responseCache?: ResponseCacheExtensions }
>;

const getDocumentWithMetadataAndTTL = memoize4(function addTypeNameToDocument(
  document: DocumentNode,
  {
    invalidateViaMutation,
    ttlPerSchemaCoordinate,
  }: {
    invalidateViaMutation: boolean;
    ttlPerSchemaCoordinate?: Record<string, number | undefined>;
  },
  schema: any,
  idFieldByTypeName: Map<string, string>,
): [DocumentNode, number | undefined] {
  const typeInfo = new TypeInfo(schema);
  let ttl: number | undefined;
  const visitor: ASTVisitor = {
    OperationDefinition: {
      enter(node): void | false {
        if (!invalidateViaMutation && node.operation === 'mutation') {
          return false;
        }
        if (node.operation === 'subscription') {
          return false;
        }
      },
    },
    ...(ttlPerSchemaCoordinate != null && {
      Field(fieldNode) {
        const parentType = typeInfo.getParentType();
        if (parentType) {
          const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
          const maybeTtl = ttlPerSchemaCoordinate[schemaCoordinate] as unknown;
          ttl = calculateTtl(maybeTtl, ttl);
        }
      },
    }),
    SelectionSet(node, _key) {
      const parentType = typeInfo.getParentType();
      const idField = parentType && idFieldByTypeName.get(parentType.name);
      const hasTypeNameSelection = node.selections.some(
        selection =>
          selection.kind === Kind.FIELD &&
          selection.name.value === '__typename' &&
          !selection.alias,
      );

      const selections = [...node.selections];

      if (!hasTypeNameSelection) {
        selections.push({
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: '__typename' },
          alias: { kind: Kind.NAME, value: '__responseCacheTypeName' },
        });
      }

      if (idField) {
        const hasIdFieldSelected = node.selections.some(
          selection =>
            selection.kind === Kind.FIELD && selection.name.value === idField && !selection.alias,
        );
        if (!hasIdFieldSelected) {
          selections.push({
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: idField },
            alias: { kind: Kind.NAME, value: '__responseCacheId' },
          });
        }
      }
      return { ...node, selections };
    },
  };

  return [visit(document, visitWithTypeInfo(typeInfo, visitor)), ttl];
});

type CacheControlDirective = {
  maxAge?: number;
  scope?: 'PUBLIC' | 'PRIVATE';
};

export function useResponseCache<PluginContext extends Record<string, any> = {}>({
  cache = createInMemoryCache(),
  ttl: globalTtl = Infinity,
  session,
  enabled,
  ignoredTypes = [],
  ttlPerType,
  ttlPerSchemaCoordinate = {},
  scopePerSchemaCoordinate = {},
  idFields = ['id'],
  invalidateViaMutation = true,
  buildResponseCacheKey = defaultBuildResponseCacheKey,
  getDocumentString = defaultGetDocumentString,
  shouldCacheResult = defaultShouldCacheResult,
  onTtl,
  includeExtensionMetadata = typeof process !== 'undefined'
    ? // eslint-disable-next-line dot-notation
      process.env['NODE_ENV'] === 'development' || !!process.env['DEBUG']
    : false,
}: UseResponseCacheParameter<PluginContext>): Plugin<PluginContext> {
  const cacheFactory = typeof cache === 'function' ? memoize1(cache) : () => cache;
  const ignoredTypesMap = new Set<string>(ignoredTypes);
  const typePerSchemaCoordinateMap = new Map<string, string[]>();
  enabled = enabled ? memoize1(enabled) : enabled;

  // never cache Introspections
  ttlPerSchemaCoordinate = { 'Query.__schema': 0, ...ttlPerSchemaCoordinate };
  if (ttlPerType) {
    // eslint-disable-next-line no-console
    console.warn(
      '[useResponseCache] `ttlForType` is deprecated. To migrate, merge it with `ttlForSchemaCoordinate` option',
    );
    for (const [typeName, ttl] of Object.entries(ttlPerType)) {
      ttlPerSchemaCoordinate[typeName] = ttl;
    }
  }

  const documentMetadataOptions = {
    queries: { invalidateViaMutation, ttlPerSchemaCoordinate },
    mutations: { invalidateViaMutation }, // remove ttlPerSchemaCoordinate for mutations to skip TTL calculation
  };
  const idFieldByTypeName = new Map<string, string>();
  let schema: any;

  function isPrivate(typeName: string, data: Record<string, unknown>): boolean {
    if (scopePerSchemaCoordinate[typeName] === 'PRIVATE') {
      return true;
    }
    return Object.keys(data).some(
      fieldName => scopePerSchemaCoordinate[`${typeName}.${fieldName}`] === 'PRIVATE',
    );
  }

  return {
    onSchemaChange({ schema: newSchema }) {
      if (schema === newSchema) {
        return;
      }
      schema = newSchema;

      const directive = schema.getDirective('cacheControl') as unknown as
        | GraphQLDirective
        | undefined;

      mapSchema(schema, {
        ...(directive && {
          [MapperKind.COMPOSITE_TYPE]: type => {
            const cacheControlAnnotations = getDirective(
              schema,
              type as any,
              'cacheControl',
            ) as unknown as CacheControlDirective[] | undefined;
            cacheControlAnnotations?.forEach(cacheControl => {
              if (cacheControl.maxAge != null) {
                ttlPerSchemaCoordinate[type.name] = cacheControl.maxAge * 1000;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[type.name] = cacheControl.scope;
              }
            });
            return type;
          },
        }),
        [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
          const schemaCoordinates = `${typeName}.${fieldName}`;
          const resultTypeNames = unwrapTypenames(fieldConfig.type);
          typePerSchemaCoordinateMap.set(schemaCoordinates, resultTypeNames);

          if (idFields.includes(fieldName) && !idFieldByTypeName.has(typeName)) {
            idFieldByTypeName.set(typeName, fieldName);
          }

          if (directive) {
            const cacheControlAnnotations = getDirective(
              schema,
              fieldConfig,
              'cacheControl',
            ) as unknown as CacheControlDirective[] | undefined;
            cacheControlAnnotations?.forEach(cacheControl => {
              if (cacheControl.maxAge != null) {
                ttlPerSchemaCoordinate[schemaCoordinates] = cacheControl.maxAge * 1000;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[schemaCoordinates] = cacheControl.scope;
              }
            });
          }
          return fieldConfig;
        },
      });
    },
    onExecute(onExecuteParams) {
      if (enabled && !enabled(onExecuteParams.args.contextValue)) {
        return;
      }
      const identifier = new Map<string, CacheEntityRecord>();
      const types = new Set<string>();
      let currentTtl: number | undefined;
      let skip = false;

      const sessionId = session(onExecuteParams.args.contextValue);

      function setExecutor({
        execute,
        onExecuteDone,
      }: {
        execute: typeof onExecuteParams.executeFn;
        onExecuteDone?: OnExecuteHookResult<PluginContext>['onExecuteDone'];
      }): OnExecuteHookResult<PluginContext> {
        let executed = false;
        onExecuteParams.setExecuteFn(args => {
          executed = true;
          return execute(args);
        });
        return {
          onExecuteDone(params) {
            if (!executed) {
              // eslint-disable-next-line no-console
              console.warn(
                '[useResponseCache] The cached execute function was not called, another plugin might have overwritten it. Please check your plugin order.',
              );
            }
            return onExecuteDone?.(params);
          },
        };
      }

      function onEntity(entity: CacheEntityRecord, data: Record<string, unknown>): void {
        if (skip) {
          return;
        }

        if (
          ignoredTypesMap.has(entity.typename) ||
          (!sessionId && isPrivate(entity.typename, data))
        ) {
          skip = true;
          return;
        }

        // in case the entity has no id, we attempt to extract it from the data
        if (!entity.id) {
          const idField = idFieldByTypeName.get(entity.typename);
          if (idField) {
            entity.id = data[idField] as string | number | undefined;
          }
        }

        types.add(entity.typename);
        if (entity.typename in ttlPerSchemaCoordinate) {
          const maybeTtl = ttlPerSchemaCoordinate[entity.typename] as unknown;
          currentTtl = calculateTtl(maybeTtl, currentTtl);
        }
        if (entity.id != null) {
          identifier.set(`${entity.typename}:${entity.id}`, entity);
        }
        for (const fieldName in data) {
          const fieldData = data[fieldName];
          if (fieldData == null || (Array.isArray(fieldData) && fieldData.length === 0)) {
            const inferredTypes = typePerSchemaCoordinateMap.get(`${entity.typename}.${fieldName}`);
            inferredTypes?.forEach(inferredType => {
              if (inferredType in ttlPerSchemaCoordinate) {
                const maybeTtl = ttlPerSchemaCoordinate[inferredType] as unknown;
                currentTtl = calculateTtl(maybeTtl, currentTtl);
              }
              identifier.set(inferredType, { typename: inferredType });
            });
          }
        }
      }

      function invalidateCache(
        result: ExecutionResult,
        setResult: (newResult: ExecutionResult) => void,
      ): void {
        let changed = false;
        if (result.data) {
          result = { ...result };
          result.data = removeMetadataFieldsFromResult(
            result.data as Record<string, unknown>,
            onEntity,
          );
          changed = true;
        }

        const cacheInstance = cacheFactory(onExecuteParams.args.contextValue);
        if (cacheInstance == null) {
          // eslint-disable-next-line no-console
          console.warn(
            '[useResponseCache] Cache instance is not available for the context. Skipping invalidation.',
          );
          return;
        }
        if (identifier.size > 0) {
          cacheInstance.invalidate(identifier.values());
          if (includeExtensionMetadata) {
            return setResult(
              resultWithMetadata(result, {
                invalidatedEntities: Array.from(identifier.values()),
              }),
            );
          }
        }
        if (changed) {
          setResult(result);
        }
      }

      if (invalidateViaMutation !== false) {
        const operationAST = getOperationAST(
          onExecuteParams.args.document,
          onExecuteParams.args.operationName,
        );

        if (operationAST?.operation === 'mutation') {
          return setExecutor({
            execute(args) {
              const [document] = getDocumentWithMetadataAndTTL(
                args.document,
                documentMetadataOptions.mutations,
                args.schema,
                idFieldByTypeName,
              );
              return onExecuteParams.executeFn({ ...args, document });
            },
            onExecuteDone({ result, setResult }) {
              if (isAsyncIterable(result)) {
                return handleAsyncIterableResult(invalidateCache);
              }

              return invalidateCache(result, setResult);
            },
          });
        }
      }

      return handleMaybePromise(
        () =>
          buildResponseCacheKey({
            documentString: getDocumentString(onExecuteParams.args),
            variableValues: onExecuteParams.args.variableValues,
            operationName: onExecuteParams.args.operationName,
            sessionId,
            context: onExecuteParams.args.contextValue,
          }),
        cacheKey => {
          const cacheInstance = cacheFactory(onExecuteParams.args.contextValue);
          if (cacheInstance == null) {
            // eslint-disable-next-line no-console
            console.warn(
              '[useResponseCache] Cache instance is not available for the context. Skipping cache lookup.',
            );
          }

          return handleMaybePromise(
            () => cacheInstance.get(cacheKey),
            cachedResponse => {
              if (cachedResponse != null) {
                return setExecutor({
                  execute: () =>
                    includeExtensionMetadata
                      ? resultWithMetadata(cachedResponse, { hit: true })
                      : cachedResponse,
                });
              }

              function maybeCacheResult(
                result: ExecutionResult,
                setResult: (newResult: ExecutionResult) => void,
              ) {
                if (result.data) {
                  result.data = removeMetadataFieldsFromResult(result.data, onEntity);
                }

                // we only use the global ttl if no currentTtl has been determined.
                let finalTtl = currentTtl ?? globalTtl;
                if (onTtl) {
                  finalTtl = onTtl({
                    ttl: finalTtl,
                    context: onExecuteParams.args.contextValue,
                  });
                }

                if (skip || !shouldCacheResult({ cacheKey, result }) || finalTtl === 0) {
                  if (includeExtensionMetadata) {
                    setResult(resultWithMetadata(result, { hit: false, didCache: false }));
                  }
                  return;
                }

                cacheInstance.set(cacheKey, result, identifier.values(), finalTtl);
                if (includeExtensionMetadata) {
                  setResult(
                    resultWithMetadata(result, { hit: false, didCache: true, ttl: finalTtl }),
                  );
                }
              }

              return setExecutor({
                execute(args) {
                  const [document, ttl] = getDocumentWithMetadataAndTTL(
                    args.document,
                    documentMetadataOptions.queries,
                    schema,
                    idFieldByTypeName,
                  );
                  currentTtl = ttl;
                  return onExecuteParams.executeFn({ ...args, document });
                },
                onExecuteDone({ result, setResult }) {
                  if (isAsyncIterable(result)) {
                    return handleAsyncIterableResult(maybeCacheResult);
                  }

                  return maybeCacheResult(result, setResult);
                },
              });
            },
          );
        },
      );
    },
  };
}

function handleAsyncIterableResult<PluginContext extends Record<string, any> = {}>(
  handler: (result: ExecutionResult, setResult: (newResult: ExecutionResult) => void) => void,
): OnExecuteDoneHookResult<PluginContext> {
  // When the result is an AsyncIterable, it means the query is using @defer or @stream.
  // This means we have to build the final result by merging the incremental results.
  // The merged result is then used to know if we should cache it and to calculate the ttl.
  const result: ExecutionResult = {};
  return {
    onNext(payload) {
      // This is the first result with the initial data payload sent to the client. We use it as the base result
      if (payload.result.data) {
        result.data = payload.result.data;
      }
      if (payload.result.errors) {
        result.errors = payload.result.errors;
      }
      if (payload.result.extensions) {
        result.extensions = payload.result.extensions;
      }

      if ('hasNext' in payload.result) {
        const { incremental, hasNext } = payload.result;
        if (incremental) {
          for (const patch of incremental) {
            mergeIncrementalResult({ executionResult: result, incrementalResult: patch });
          }
        }

        if (!hasNext) {
          // The query is complete, we can process the final result
          handler(result, payload.setResult);
        }
      }

      const newResult = { ...payload.result };

      // Handle initial/single result
      if (newResult.data) {
        newResult.data = removeMetadataFieldsFromResult(newResult.data);
      }

      // Handle Incremental results
      if ('hasNext' in newResult && newResult.incremental) {
        newResult.incremental = newResult.incremental.map(value => {
          if ('items' in value && value.items) {
            return {
              ...value,
              items: removeMetadataFieldsFromResult(value.items),
            };
          }
          if ('data' in value && value.data) {
            return {
              ...value,
              data: removeMetadataFieldsFromResult(value.data),
            };
          }
          return value;
        });
      }
      payload.setResult(newResult);
    },
  };
}

export function resultWithMetadata(
  result: ExecutionResult,
  metadata: ResponseCacheExtensions,
): ResponseCacheExecutionResult {
  return {
    ...result,
    extensions: {
      ...result.extensions,
      responseCache: {
        ...(result as ResponseCacheExecutionResult).extensions?.responseCache,
        ...metadata,
      },
    },
  };
}

function calculateTtl(typeTtl: unknown, currentTtl: number | undefined): number | undefined {
  if (typeof typeTtl === 'number' && !Number.isNaN(typeTtl)) {
    if (typeof currentTtl === 'number') {
      return Math.min(currentTtl, typeTtl);
    }
    return typeTtl;
  }
  return currentTtl;
}

function unwrapTypenames(ttype: GraphQLType): string[] {
  if (isListType(ttype) || isNonNullType(ttype)) {
    return unwrapTypenames(ttype.ofType);
  }

  if (isUnionType(ttype)) {
    return ttype
      .getTypes()
      .map(ttype => unwrapTypenames(ttype))
      .flat();
  }

  return [ttype.name];
}

export const cacheControlDirective = /* GraphQL */ `
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT
`;

type OnEntityHandler = (
  entity: CacheEntityRecord,
  data: Record<string, unknown>,
) => void | Promise<void>;

function removeMetadataFieldsFromResult(
  data: Record<string, unknown>,
  onEntity?: OnEntityHandler,
): Record<string, unknown>;
function removeMetadataFieldsFromResult(
  data: Array<Record<string, unknown>>,
  onEntity?: OnEntityHandler,
): Array<Record<string, unknown>>;
function removeMetadataFieldsFromResult(
  data: null | undefined,
  onEntity?: OnEntityHandler,
): null | undefined;
function removeMetadataFieldsFromResult(
  data: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined,
  onEntity?: OnEntityHandler,
): Record<string, unknown> | Array<unknown> | null | undefined {
  if (Array.isArray(data)) {
    return data.map(record => removeMetadataFieldsFromResult(record, onEntity));
  }

  if (typeof data !== 'object' || data == null) {
    return data;
  }

  const dataPrototype = Object.getPrototypeOf(data);

  if (dataPrototype != null && dataPrototype !== Object.prototype) {
    return data;
  }

  // clone the data to avoid mutation
  data = { ...data };

  const typename = data['__responseCacheTypeName'] ?? data['__typename'];
  if (typeof typename === 'string') {
    const entity: CacheEntityRecord = { typename };
    delete data['__responseCacheTypeName'];

    if (
      data['__responseCacheId'] &&
      (typeof data['__responseCacheId'] === 'string' ||
        typeof data['__responseCacheId'] === 'number')
    ) {
      entity.id = data['__responseCacheId'];
      delete data['__responseCacheId'];
    }

    onEntity?.(entity, data);
  }

  for (const key in data) {
    const value = data[key];
    if (Array.isArray(value)) {
      data[key] = removeMetadataFieldsFromResult(value, onEntity);
    }
    if (value !== null && typeof value === 'object') {
      data[key] = removeMetadataFieldsFromResult(value as Record<string, unknown>, onEntity);
    }
  }

  return data;
}
