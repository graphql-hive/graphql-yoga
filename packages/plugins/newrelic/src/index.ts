import { ExecutionResult, FieldNode, getOperationAST, GraphQLError, Kind, print } from 'graphql';
import newRelic from 'newrelic';
import { DefaultContext, getDocumentString, isAsyncIterable, Path, Plugin } from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';

export enum AttributeName {
  COMPONENT_NAME = 'Envelop_NewRelic_Plugin',
  ANONYMOUS_OPERATION = '<anonymous>',
  EXECUTION_RESULT = 'graphql.execute.result',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_TYPE = 'graphql.execute.operationType',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
  RESOLVER_FIELD_PATH = 'graphql.resolver.fieldPath',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_RESULT = 'graphql.resolver.result',
  RESOLVER_ARGS = 'graphql.resolver.args',
}

export type UseNewRelicOptions = {
  includeOperationDocument?: boolean;
  includeExecuteVariables?: boolean | RegExp;
  includeRawResult?: boolean;
  trackResolvers?: boolean;
  includeResolverArgs?: boolean | RegExp;
  rootFieldsNaming?: boolean;
  /**
   * Function that returns a custom operation name to be used as transaction name and attribute
   */
  extractOperationName?: (context: DefaultContext) => string | undefined;
  /**
   * Indicates whether or not to skip reporting a given error to NewRelic.
   * By default, this plugin skips all `Error` errors and does not report them to NewRelic.
   */
  skipError?: (error: GraphQLError) => boolean;

  shim?: any;
};

interface InternalOptions extends UseNewRelicOptions {
  isExecuteVariablesRegex?: boolean;
  isResolverArgsRegex?: boolean;
}

const DEFAULT_OPTIONS: UseNewRelicOptions = {
  includeOperationDocument: false,
  includeExecuteVariables: false,
  includeRawResult: false,
  trackResolvers: false,
  includeResolverArgs: false,
  rootFieldsNaming: false,
  skipError: () => false,
};

export const useNewRelic = (rawOptions?: UseNewRelicOptions): Plugin => {
  const options: InternalOptions = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  };
  options.isExecuteVariablesRegex = options.includeExecuteVariables instanceof RegExp;
  options.isResolverArgsRegex = options.includeResolverArgs instanceof RegExp;
  const instrumentationApi = rawOptions?.shim || newRelic?.shim;
  if (!instrumentationApi?.agent) {
    console.warn(
      'Agent unavailable. Please check your New Relic Agent configuration and ensure New Relic is enabled.',
    );
    return {};
  }
  instrumentationApi.agent.metrics
    .getOrCreateMetric(`Supportability/ExternalModules/${AttributeName.COMPONENT_NAME}`)
    .incrementCallCount();

  const logger = instrumentationApi.logger.child({ component: AttributeName.COMPONENT_NAME });
  logger.info(`${AttributeName.COMPONENT_NAME} registered`);

  return {
    onPluginInit({ addPlugin }) {
      if (options.trackResolvers) {
        addPlugin(
          useOnResolve(({ args: resolversArgs, info }) => {
            const transaction = instrumentationApi.agent.tracer.getTransaction();
            if (!transaction) {
              logger.trace('No transaction found. Not recording resolver.');
              return () => {};
            }
            const transactionNameState = transaction.nameState;
            if (!transactionNameState) {
              logger.trace('No transaction name state found. Not recording resolver.');
              return () => {};
            }
            const delimiter = transactionNameState.delimiter;

            const { returnType, path, parentType } = info;
            const formattedPath = flattenPath(path, delimiter);
            const currentSegment = instrumentationApi.getActiveSegment();
            if (!currentSegment) {
              logger.trace(
                'No active segment found at resolver call. Not recording resolver (%s).',
                formattedPath,
              );
              return () => {};
            }

            const resolverSegment = instrumentationApi.createSegment(
              `resolver${delimiter}${formattedPath}`,
              null,
              currentSegment,
            );
            if (!resolverSegment) {
              logger.trace('Resolver segment was not created (%s).', formattedPath);
              return () => {};
            }
            resolverSegment.start();
            resolverSegment.addAttribute(AttributeName.RESOLVER_FIELD_PATH, formattedPath);
            resolverSegment.addAttribute(AttributeName.RESOLVER_TYPE_NAME, parentType.toString());
            resolverSegment.addAttribute(AttributeName.RESOLVER_RESULT_TYPE, returnType.toString());
            if (options.includeResolverArgs) {
              const rawArgs = resolversArgs || {};
              const resolverArgsToTrack = options.isResolverArgsRegex
                ? filterPropertiesByRegex(rawArgs, options.includeResolverArgs as RegExp)
                : rawArgs;
              resolverSegment.addAttribute(
                AttributeName.RESOLVER_ARGS,
                JSON.stringify(resolverArgsToTrack),
              );
            }
            return ({ result }) => {
              if (options.includeRawResult) {
                resolverSegment.addAttribute(AttributeName.RESOLVER_RESULT, JSON.stringify(result));
              }
              resolverSegment.end();
            };
          }),
        );
      }
    },
    onExecute({ args }) {
      const rootOperation = getOperationAST(args.document, args.operationName);
      if (!rootOperation) {
        logger.trace('No root operation found. Not recording transaction.');
        return;
      }
      const operationType = rootOperation.operation;
      const operationName =
        options.extractOperationName?.(args.contextValue) ||
        args.operationName ||
        rootOperation.name?.value ||
        AttributeName.ANONYMOUS_OPERATION;

      const transaction = instrumentationApi.agent.tracer.getTransaction();
      const transactionNameState = transaction?.nameState;
      if (transactionNameState) {
        const delimiter = transactionNameState.delimiter || '/';
        let rootFields: string[] | null = null;

        if (options.rootFieldsNaming) {
          const fieldNodes = rootOperation.selectionSet.selections.filter(
            selectionNode => selectionNode.kind === Kind.FIELD,
          ) as FieldNode[];
          rootFields = fieldNodes.map(fieldNode => fieldNode.name.value);
        }

        const operationType = rootOperation.operation;

        transactionNameState.setName(
          transactionNameState.prefix,
          transactionNameState.verb,
          delimiter,
          operationType +
            delimiter +
            operationName +
            (rootFields ? delimiter + rootFields.join('&') : ''),
        );
      }

      const spanContext = instrumentationApi.agent.tracer.getSpanContext();

      spanContext?.addCustomAttribute(AttributeName.EXECUTION_OPERATION_NAME, operationName);
      spanContext?.addCustomAttribute(AttributeName.EXECUTION_OPERATION_TYPE, operationType);
      options.includeOperationDocument &&
        spanContext?.addCustomAttribute(
          AttributeName.EXECUTION_OPERATION_DOCUMENT,
          getDocumentString(args.document, print),
        );

      if (options.includeExecuteVariables) {
        const rawVariables = args.variableValues || {};
        const executeVariablesToTrack = options.isExecuteVariablesRegex
          ? filterPropertiesByRegex(rawVariables, options.includeExecuteVariables as RegExp)
          : rawVariables;

        spanContext?.addCustomAttribute(
          AttributeName.EXECUTION_VARIABLES,
          JSON.stringify(executeVariablesToTrack),
        );
      }

      const operationSegment = instrumentationApi.getActiveSegment();

      return {
        onExecuteDone({ result }) {
          const sendResult = (singularResult: ExecutionResult) => {
            if (singularResult.data && options.includeRawResult) {
              spanContext?.addCustomAttribute(
                AttributeName.EXECUTION_RESULT,
                JSON.stringify(singularResult),
              );
            }

            if (singularResult.errors && singularResult.errors.length > 0) {
              const agent = instrumentationApi.agent;
              const transaction = instrumentationApi.tracer.getTransaction();

              if (transaction) {
                for (const error of singularResult.errors) {
                  if (options.skipError?.(error)) continue;
                  agent.errors.add(transaction, JSON.stringify(error));
                }
              }
            }
          };
          if (isAsyncIterable(result)) {
            return {
              onNext: ({ result: singularResult }) => {
                sendResult(singularResult);
              },
              onEnd: () => {
                operationSegment?.end();
              },
            };
          }
          sendResult(result);
          operationSegment?.end();
          return {};
        },
      };
    },
  };
};

function flattenPath(fieldPath: Path, delimiter = '/') {
  const pathArray = [];
  let thisPath: Path | undefined = fieldPath;

  while (thisPath) {
    if (typeof thisPath.key !== 'number') {
      pathArray.push(thisPath.key);
    }
    thisPath = thisPath.prev;
  }

  return pathArray.reverse().join(delimiter);
}

function filterPropertiesByRegex(initialObject: { [key: string]: any }, pattern: RegExp) {
  const filteredObject: Record<string, any> = {};

  for (const property of Object.keys(initialObject)) {
    if (pattern.test(property)) filteredObject[property] = initialObject[property];
  }

  return filteredObject;
}
