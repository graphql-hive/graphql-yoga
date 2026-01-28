import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  GraphQLSchema,
  isIntrospectionType,
  isObjectType,
} from 'graphql';
import type { Plugin } from '@envelop/core';
import { handleMaybePromise, mapMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';

export type Resolver<Context = unknown> = (
  root: unknown,
  args: Record<string, unknown>,
  context: Context,
  info: GraphQLResolveInfo,
) => MaybePromise<unknown>;

export type AfterResolver = (options: {
  result: unknown;
  setResult: (newResult: unknown) => void;
}) => MaybePromise<void>;

export interface OnResolveOptions<PluginContext extends Record<string, any> = {}> {
  context: PluginContext;
  root: unknown;
  args: Record<string, unknown>;
  info: GraphQLResolveInfo;
  resolver: Resolver<PluginContext>;
  replaceResolver: (newResolver: Resolver<PluginContext>) => void;
}

export type OnResolve<PluginContext extends Record<string, any> = {}> = (
  options: OnResolveOptions<PluginContext>,
) => MaybePromise<AfterResolver | void>;

export type UseOnResolveOptions = {
  /**
   * Skip executing the `onResolve` hook on introspection queries.
   *
   * @default true
   */
  skipIntrospection?: boolean;

  /**
   * Skip executing the `onResolve` hook on fields with default resolvers.
   *
   * @default false
   */
  skipDefaultResolvers?: boolean;
};

/**
 * Wraps the provided schema by hooking into the resolvers of every field.
 *
 * Use the `onResolve` argument to manipulate the resolver and its results/errors.
 */
export function useOnResolve<PluginContext extends Record<string, any> = {}>(
  onResolve: OnResolve<PluginContext>,
  opts: UseOnResolveOptions = { skipIntrospection: true, skipDefaultResolvers: false },
): Plugin<PluginContext> {
  const hasWrappedResolveSymbol = Symbol('hasWrappedResolve');
  return {
    onSchemaChange({ schema: _schema }) {
      const schema = _schema as GraphQLSchema;
      if (!schema) return; // nothing to do if schema is missing

      for (const type of Object.values(schema.getTypeMap())) {
        if ((!opts.skipIntrospection || !isIntrospectionType(type)) && isObjectType(type)) {
          for (const field of Object.values(type.getFields())) {
            if ((field as { [hasWrappedResolveSymbol]?: true })[hasWrappedResolveSymbol]) continue;
            if (
              opts.skipDefaultResolvers &&
              (!field.resolve ||
                field.resolve?.name === 'defaultFieldResolver' ||
                field.resolve?.name === 'defaultMergedResolver')
            ) {
              continue;
            }

            let resolver = (field.resolve || defaultFieldResolver) as Resolver<PluginContext>;

            field.resolve = (root, args, context, info) =>
              handleMaybePromise(
                () =>
                  onResolve({
                    root,
                    args,
                    context,
                    info,
                    resolver,
                    replaceResolver: newResolver => {
                      resolver = newResolver;
                    },
                  }),
                afterResolve => {
                  if (typeof afterResolve === 'function') {
                    return handleMaybePromise(
                      () => resolver(root, args, context, info),
                      result =>
                        mapMaybePromise(
                          afterResolve({
                            result,
                            setResult: newResult => {
                              result = newResult;
                            },
                          }),
                          () => result,
                        ),
                      errorResult =>
                        handleMaybePromise(
                          () =>
                            afterResolve({
                              result: errorResult,
                              setResult: newResult => {
                                errorResult = newResult;
                              },
                            }),
                          () => {
                            throw errorResult;
                          },
                        ),
                    );
                  }
                  return resolver(root, args, context, info);
                },
              );

            (field as { [hasWrappedResolveSymbol]?: true })[hasWrappedResolveSymbol] = true;
          }
        }
      }
    },
  };
}
