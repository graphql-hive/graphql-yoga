import { GraphQLError, Kind, OperationDefinitionNode, print } from 'graphql';
import {
  getDocumentString,
  handleStreamOrSingleExecutionResult,
  isOriginalGraphQLError,
  OnExecuteDoneHookResultOnNextHook,
  TypedExecutionArgs,
  type Plugin,
} from '@envelop/core';
import * as Sentry from '@sentry/node';

interface TraceparentData {
  /**
   * Trace ID
   */
  traceId?: string | undefined;
  /**
   * Parent Span ID
   */
  parentSpanId?: string | undefined;
  /**
   * If this transaction has a parent, the parent's sampling decision
   */
  parentSampled?: boolean | undefined;
}

export type SentryPluginOptions<PluginContext extends Record<string, any>> = {
  /**
   * Force the creation of a new transaction for every GraphQL Operation.
   * By default, Sentry mange the creation of transactions automatically.
   * By enabling this option, you can ensure that the GraphQL execution pipeline
   * is always wrapped in its own transaction.
   *
   * @default false
   */
  forceTransaction?: boolean;
  /**
   * Renames Transaction.
   * @default false
   */
  renameTransaction?: boolean;
  /**
   * Adds result of each resolver and operation to Span's data (available under "result")
   * @default false
   */
  includeRawResult?: boolean;
  /**
   * Adds operation's variables to a Scope (only in case of errors)
   * @default false
   */
  includeExecuteVariables?: boolean;
  /**
   * The key of the event id in the error's extension. `null` to disable.
   * @default sentryEventId
   */
  eventIdKey?: string | null;
  /**
   * Adds custom tags to every Span.
   */
  appendTags?: (args: TypedExecutionArgs<PluginContext>) => Record<string, unknown>;
  /**
   * Callback to set context information onto the scope.
   */
  configureScope?: (args: TypedExecutionArgs<PluginContext>, scope: Sentry.Scope) => void;
  /**
   * Produces a name of Transaction (only when "renameTransaction" or "forceTransaction" are enabled) and description of created Span.
   *
   * @default operation's name or "Anonymous Operation" when missing)
   */
  transactionName?: (args: TypedExecutionArgs<PluginContext>) => string;
  /**
   * Produces tracing data for Span
   *
   * @default is empty
   */
  traceparentData?: (args: TypedExecutionArgs<PluginContext>) => TraceparentData | undefined;
  /**
   * Produces a "op" (operation) of created Span.
   *
   * @default execute
   */
  operationName?: (args: TypedExecutionArgs<PluginContext>) => string;
  /**
   * Indicates whether or not to skip the entire Sentry flow for given GraphQL operation.
   * By default, no operations are skipped.
   */
  skip?: (args: TypedExecutionArgs<PluginContext>) => boolean;
  /**
   * Indicates whether or not to skip Sentry exception reporting for a given error.
   * By default, this plugin skips all `GraphQLError` errors and does not report it to Sentry.
   */
  skipError?: (args: Error) => boolean;
};

export const defaultSkipError = isOriginalGraphQLError;

export const useSentry = <PluginContext extends Record<string, any> = {}>(
  options: SentryPluginOptions<PluginContext> = {},
): Plugin<PluginContext> => {
  function pick<K extends keyof SentryPluginOptions<PluginContext>>(
    key: K,
    defaultValue: NonNullable<SentryPluginOptions<PluginContext>[K]>,
  ) {
    return options[key] ?? defaultValue;
  }

  const forceTransaction = pick('forceTransaction', false);
  const includeRawResult = pick('includeRawResult', false);
  const includeExecuteVariables = pick('includeExecuteVariables', false);
  const renameTransaction = pick('renameTransaction', false);
  const skipOperation = pick('skip', () => false);
  const skipError = pick('skipError', defaultSkipError);

  const eventIdKey = options.eventIdKey === null ? null : 'sentryEventId';

  function addEventId(err: GraphQLError, eventId: string | null): GraphQLError {
    if (eventIdKey !== null && eventId !== null) {
      err.extensions[eventIdKey] = eventId;
    }

    return err;
  }

  return {
    onExecute({ args, executeFn, setExecuteFn }) {
      if (skipOperation(args)) {
        return;
      }

      const rootOperation = args.document.definitions.find(
        // @ts-expect-error TODO: not sure how we will make it dev friendly
        o => o.kind === Kind.OPERATION_DEFINITION,
      ) as OperationDefinitionNode;
      const operationType = rootOperation.operation;

      const document = getDocumentString(args.document, print);

      const opName = args.operationName || rootOperation.name?.value || 'Anonymous Operation';
      const addedTags: Record<string, any> = (options.appendTags && options.appendTags(args)) || {};
      const traceparentData = (options.traceparentData && options.traceparentData(args)) || {};

      const transactionName = options.transactionName ? options.transactionName(args) : opName;
      const op = options.operationName ? options.operationName(args) : 'execute';
      const tags = {
        operationName: opName,
        operation: operationType,
        ...addedTags,
      };

      return Sentry.startSpanManual(
        {
          name: transactionName,
          op,
          attributes: tags,
          forceTransaction,
          ...traceparentData,
        },
        rootSpan => {
          rootSpan.setAttribute('document', document);

          if (renameTransaction) {
            Sentry.getCurrentScope().setTransactionName(transactionName);
          }

          if (options.configureScope) {
            options.configureScope(args, Sentry.getCurrentScope());
          }

          // Give access to the span during resolvers execution
          setExecuteFn(args => Sentry.withActiveSpan(rootSpan, () => executeFn(args)));

          return {
            onExecuteDone(payload) {
              const handleResult: OnExecuteDoneHookResultOnNextHook<{}> = ({
                result,
                setResult,
              }) => {
                if (includeRawResult) {
                  // @ts-expect-error TODO: not sure if this is correct
                  rootSpan?.setAttribute('result', result);
                }

                if (result.errors && result.errors.length > 0) {
                  Sentry.withScope(scope => {
                    scope.setTransactionName(opName);
                    scope.setTag('operation', operationType);
                    scope.setTag('operationName', opName);
                    scope.setExtra('document', document);

                    scope.setTags(addedTags || {});

                    if (includeRawResult) {
                      scope.setExtra('result', result);
                    }

                    if (includeExecuteVariables) {
                      scope.setExtra('variables', args.variableValues);
                    }

                    const errors = result.errors?.map(err => {
                      if (skipError(err) === true) {
                        return err;
                      }

                      const errorPath = (err.path ?? [])
                        .map((v: string | number) => (typeof v === 'number' ? '$index' : v))
                        .join(' > ');

                      if (errorPath) {
                        scope.addBreadcrumb({
                          category: 'execution-path',
                          message: errorPath,
                          level: 'debug',
                        });
                      }

                      const eventId = Sentry.captureException(err.originalError, {
                        fingerprint: ['graphql', errorPath, opName, operationType],
                        contexts: {
                          GraphQL: {
                            operationName: opName,
                            operationType,
                            variables: args.variableValues,
                          },
                        },
                      });

                      return addEventId(err, eventId);
                    });

                    setResult({
                      ...result,
                      errors,
                    });
                  });
                }

                rootSpan?.end();
              };
              return handleStreamOrSingleExecutionResult(payload, handleResult);
            },
          };
        },
      );
    },
  };
};
