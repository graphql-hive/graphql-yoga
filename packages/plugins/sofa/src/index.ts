import { ExecutionArgs, ExecutionResult, SubscriptionArgs } from 'graphql';
import { Plugin, YogaInitialContext, YogaServerInstance } from 'graphql-yoga';
import { useSofa as createSofaHandler } from 'sofa-api';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { SofaHandler } from './types.js';

type SofaHandlerConfig = Parameters<typeof createSofaHandler>[0];

export type SofaPluginConfig = Omit<
  SofaHandlerConfig,
  'schema' | 'context' | 'execute' | 'subscribe'
>;

export function useSofa(config: SofaPluginConfig): Plugin {
  let sofaHandler: SofaHandler;
  let getEnveloped: YogaServerInstance<
    Record<string, unknown>,
    Record<string, unknown>
  >['getEnveloped'];

  const envelopedByContext = new WeakMap<
    YogaInitialContext,
    ReturnType<YogaServerInstance<Record<string, unknown>, Record<string, unknown>>['getEnveloped']>
  >();

  return {
    onYogaInit({ yoga }) {
      getEnveloped = yoga.getEnveloped;
    },
    onSchemaChange(onSchemaChangeEventPayload) {
      sofaHandler = createSofaHandler({
        ...config,
        schema: onSchemaChangeEventPayload.schema,
        context(serverContext: YogaInitialContext) {
          const enveloped = getEnveloped(serverContext);
          return handleMaybePromise(
            () => enveloped.contextFactory(serverContext),
            contextValue$ => {
              envelopedByContext.set(contextValue$, enveloped);
              return contextValue$;
            },
          );
        },
        execute(
          ...args:
            | [ExecutionArgs]
            | [
                schema: ExecutionArgs['schema'],
                document: ExecutionArgs['document'],
                rootValue?: ExecutionArgs['rootValue'],
                contextValue?: ExecutionArgs['contextValue'],
                variableValues?: ExecutionArgs['variableValues'],
                operationName?: ExecutionArgs['operationName'],
                fieldResolver?: ExecutionArgs['fieldResolver'],
                typeResolver?: ExecutionArgs['typeResolver'],
              ]
        ): Promise<ExecutionResult> {
          const executionArgs =
            args.length === 1
              ? args[0]
              : {
                  schema: args[0],
                  document: args[1],
                  rootValue: args[2],
                  contextValue: args[3],
                  variableValues: args[4],
                  operationName: args[5],
                  fieldResolver: args[6],
                  typeResolver: args[7],
                };
          const enveloped = envelopedByContext.get(
            executionArgs.contextValue as YogaInitialContext,
          );
          if (!enveloped) {
            throw new TypeError('Illegal invocation.');
          }
          return enveloped.execute(executionArgs);
        },
        subscribe(
          ...args:
            | [SubscriptionArgs | ExecutionArgs]
            | [
                schema: SubscriptionArgs['schema'],
                document: SubscriptionArgs['document'],
                rootValue?: SubscriptionArgs['rootValue'],
                contextValue?: SubscriptionArgs['contextValue'],
                variableValues?: SubscriptionArgs['variableValues'],
                operationName?: SubscriptionArgs['operationName'],
                fieldResolver?: SubscriptionArgs['fieldResolver'],
                subscribeFieldResolver?: SubscriptionArgs['subscribeFieldResolver'],
              ]
        ) {
          const subscriptionArgs =
            args.length === 1
              ? args[0]
              : {
                  schema: args[0],
                  document: args[1],
                  rootValue: args[2],
                  contextValue: args[3],
                  variableValues: args[4],
                  operationName: args[5],
                  fieldResolver: args[6],
                  subscribeFieldResolver: args[7],
                };
          const enveloped = envelopedByContext.get(
            subscriptionArgs.contextValue as YogaInitialContext,
          );
          if (!enveloped) {
            throw new TypeError('Illegal invocation.');
          }
          return enveloped.subscribe(subscriptionArgs);
        },
      });
    },
    onRequest({ request, endResponse, serverContext, url }) {
      if (url.pathname.startsWith(config.basePath)) {
        return handleMaybePromise(
          () => sofaHandler.handleRequest(request, serverContext),
          res => {
            if (res) {
              endResponse(res);
            }
          },
        );
      }
    },
  };
}
