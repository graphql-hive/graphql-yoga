import { isPromise } from 'util/types';
import {
  getNamedType,
  GraphQLError,
  GraphQLField,
  GraphQLNamedOutputType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isListType,
  isObjectType,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import picomatch from 'picomatch';
import type { Plugin } from '@envelop/core';
import {
  createGraphQLError,
  getArgumentValues,
  getDefinedRootType,
  getDirectiveExtensions,
  getOperationASTFromDocument,
  memoize1,
  memoize4,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { getGraphQLRateLimiter } from './get-graphql-rate-limiter.js';
import { InMemoryStore } from './in-memory-store.js';
import { RedisStore } from './redis-store.js';
import { Store } from './store.js';
import type {
  FormatErrorInput,
  GraphQLRateLimitConfig,
  GraphQLRateLimitDirectiveArgs,
  Identity,
  Options,
} from './types.js';

export {
  FormatErrorInput,
  GraphQLRateLimitConfig,
  GraphQLRateLimitDirectiveArgs,
  Identity,
  InMemoryStore,
  Options,
  RedisStore,
  Store,
};

export type IdentifyFn<ContextType = unknown> = (context: ContextType) => string;

interface RateLimitExecutionParams<ContextType = unknown> {
  root: unknown;
  args: Record<string, unknown>;
  context: ContextType;
  type: GraphQLNamedOutputType;
  field: GraphQLField<any, any>;
}

export type MessageInterpolator<ContextType = unknown> = (
  message: string,
  identifier: string,
  params: RateLimitExecutionParams<ContextType>,
) => string;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @rateLimit(
    max: Int
    window: String
    message: String
    identityArgs: [String]
    arrayLengthField: String
    readOnly: Boolean
    uncountRejected: Boolean
  ) on FIELD_DEFINITION
`;

export type RateLimitDirectiveArgs = {
  max?: number;
  window?: string;
  message?: string;
  identityArgs?: string[];
  arrayLengthField?: string;
  readOnly?: boolean;
  uncountRejected?: boolean;
};

export type RateLimiterPluginOptions = {
  identifyFn: IdentifyFn;
  rateLimitDirectiveName?: 'rateLimit' | string;
  transformError?: (message: string) => Error;
  onRateLimitError?: (
    event: { error: string; identifier: string } & RateLimitExecutionParams,
  ) => void;
  interpolateMessage?: MessageInterpolator;
  configByField?: ConfigByField[];
} & Omit<GraphQLRateLimitConfig, 'identifyContext'>;

export interface ConfigByField extends RateLimitDirectiveArgs {
  type: string;
  field: string;
  identifyFn?: IdentifyFn;
}

export const defaultInterpolateMessageFn: MessageInterpolator = (message, identifier) =>
  interpolateByArgs(message, { id: identifier });

interface RateLimiterContext {
  rateLimiterFn: ReturnType<typeof getGraphQLRateLimiter>;
}

const getTypeInfo = memoize1(function getTypeInfo(schema: GraphQLSchema) {
  return new TypeInfo(schema);
});

export const useRateLimiter = (options: RateLimiterPluginOptions): Plugin<RateLimiterContext> => {
  const rateLimiterFn = getGraphQLRateLimiter({
    ...options,
    identifyContext: options.identifyFn,
  });

  const interpolateMessage = options.interpolateMessage || defaultInterpolateMessageFn;

  const configByField =
    options.configByField?.map(config => ({
      ...config,
      isMatch: {
        type: picomatch(config.type),
        field: picomatch(config.field),
      },
    })) || [];

  const directiveName = options.rateLimitDirectiveName ?? 'rateLimit';

  interface FinalRateLimitConfig extends RateLimitDirectiveArgs {
    isMatch?: {
      type: picomatch.Matcher;
      field: picomatch.Matcher;
    };
    type?: string;
    field?: string;
    identifyFn?: IdentifyFn;
    max?: number;
    window?: string;
    message?: string;
    identityArgs?: string[];
    arrayLengthField?: string;
    readOnly?: boolean;
    uncountRejected?: boolean;
  }
  const getRateLimitConfig = memoize4(function getFieldConfigs(
    configByField: (ConfigByField & {
      isMatch: {
        type: picomatch.Matcher;
        field: picomatch.Matcher;
      };
    })[],
    schema: GraphQLSchema,
    type: GraphQLNamedOutputType,
    field: GraphQLField<any, any>,
  ): FinalRateLimitConfig | undefined {
    const fieldConfigs = configByField?.filter(
      ({ isMatch }) => isMatch.type(type.name) && isMatch.field(field.name),
    );
    if (fieldConfigs && fieldConfigs.length > 1) {
      throw new Error(
        `Config error: field '${type.name}.${field.name}' has multiple matching configuration`,
      );
    }
    const fieldConfig = fieldConfigs?.[0];

    const rateLimitDirective = getDirectiveExtensions(field, schema)[
      directiveName
    ]?.[0] as RateLimitDirectiveArgs;

    if (rateLimitDirective && fieldConfig) {
      throw new Error(
        `Config error: field '${type.name}.${field.name}' has both a configuration and a directive`,
      );
    }

    const rateLimitConfig: FinalRateLimitConfig = rateLimitDirective || fieldConfig;

    if (!rateLimitConfig) {
      return undefined;
    }

    rateLimitConfig.max = Number(rateLimitConfig.max);

    if (rateLimitConfig?.identifyFn) {
      rateLimitConfig.identityArgs = ['identifier', ...(rateLimitConfig.identityArgs ?? [])];
    }

    return rateLimitConfig;
  });
  return {
    onExecute({ args, setResultAndStopExecution }) {
      const { document, schema, contextValue: context, variableValues, rootValue: root } = args;
      const typeInfo = getTypeInfo(schema);
      const rateLimitCalls = new Set<Promise<boolean>>();
      const errors: GraphQLError[] = [];
      args.document = visit(
        document,
        visitWithTypeInfo(typeInfo, {
          Field(node, _key, _parent, path, _ancestors) {
            const type = typeInfo.getParentType();
            const field = typeInfo.getFieldDef();
            if (type != null && field != null) {
              const rateLimitConfig = getRateLimitConfig(configByField, schema, type, field);
              if (!rateLimitConfig) {
                return;
              }

              const resolverRateLimitConfig = { ...rateLimitConfig };
              const identifier = (rateLimitConfig?.identifyFn ?? options.identifyFn)(context);

              let args: Record<string, any> | null = null;
              function getArgValues() {
                if (!args) {
                  if (field) {
                    args = getArgumentValues(field, node, variableValues);
                  }
                }
                return args;
              }

              const executionArgs = {
                identifier,
                root,
                get args() {
                  return {
                    ...(getArgValues() || {}),
                    identifier,
                  };
                },
                context,
                type,
                field,
              };

              if (resolverRateLimitConfig.message && identifier) {
                resolverRateLimitConfig.message = interpolateMessage(
                  resolverRateLimitConfig.message,
                  identifier,
                  executionArgs,
                );
              }
              const rateLimitResult = handleMaybePromise(
                () => rateLimiterFn(field.name, executionArgs, resolverRateLimitConfig),
                rateLimitError => {
                  if (!rateLimitError) {
                    return true;
                  }

                  if (options.onRateLimitError) {
                    options.onRateLimitError({
                      error: rateLimitError,
                      ...executionArgs,
                    });
                  }

                  if (options.transformError) {
                    throw options.transformError(rateLimitError);
                  }

                  const resolvePath: (string | number)[] = [];

                  let curr: any = document;
                  const operationAST = getOperationASTFromDocument(document);
                  let currType: GraphQLOutputType | undefined | null = getDefinedRootType(
                    schema,
                    operationAST.operation,
                  );
                  for (const pathItem of path) {
                    curr = curr[pathItem];
                    if (curr?.kind === 'Field') {
                      const fieldName = curr.name.value;
                      const responseKey = curr.alias?.value ?? fieldName;
                      let field: GraphQLField<any, any> | undefined;
                      if (isObjectType(currType)) {
                        field = currType.getFields()[fieldName];
                      } else if (isAbstractType(currType)) {
                        for (const possibleType of schema.getPossibleTypes(currType)) {
                          field = possibleType.getFields()[fieldName];
                          if (field) {
                            break;
                          }
                        }
                      }
                      if (isListType(field?.type)) {
                        resolvePath.push('@');
                      }
                      resolvePath.push(responseKey);
                      if (field?.type) {
                        currType = getNamedType(field.type);
                      }
                    }
                  }

                  const errorOptions: Parameters<typeof createGraphQLError>[1] = {
                    extensions: { http: { statusCode: 429 } },
                    path: resolvePath,
                    nodes: [node],
                  };

                  if (resolverRateLimitConfig.window) {
                    errorOptions.extensions.http.headers = {
                      'Retry-After': resolverRateLimitConfig.window,
                    };
                  }

                  errors.push(createGraphQLError(rateLimitError, errorOptions));

                  return false;
                },
              );
              if (isPromise(rateLimitResult)) {
                rateLimitCalls.add(rateLimitResult);
                return node;
              } else if (rateLimitResult === false) {
                return null;
              }
            }
            return node;
          },
        }),
      );
      return handleMaybePromise(
        () => (rateLimitCalls.size ? Promise.all(rateLimitCalls) : undefined),
        () => {
          if (errors.length) {
            setResultAndStopExecution({
              errors,
            });
          }
        },
      );
    },
    onContextBuilding({ extendContext }) {
      extendContext({
        rateLimiterFn,
      });
    },
  };
};

function interpolateByArgs(message: string, args: { [key: string]: string }) {
  return message.replace(/\{{([^)]*)\}}/g, (_, key) => args[key.trim()]);
}
