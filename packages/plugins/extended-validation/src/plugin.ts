import {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  TypeInfo,
  ValidationContext,
  visit,
  visitInParallel,
  visitWithTypeInfo,
} from 'graphql';
import {
  AsyncIterableIteratorOrValue,
  isAsyncIterable,
  OnExecuteEventPayload,
  OnExecuteHookResult,
  OnSubscribeEventPayload,
  OnSubscribeHookResult,
  Plugin,
} from '@envelop/core';
import { ExtendedValidationRule } from './common.js';

const symbolExtendedValidationRules = Symbol('extendedValidationContext');

type ExtendedValidationContext = {
  rules: Array<ExtendedValidationRule>;
  didRun: boolean;
};

type OnValidationFailedCallback = (params: {
  args: ExecutionArgs;
  result: ExecutionResult;
  setResult: (result: ExecutionResult) => void;
}) => void;

export const useExtendedValidation = <PluginContext extends Record<string, any> = {}>(options: {
  rules: Array<ExtendedValidationRule>;
  /**
   * Callback that is invoked when the document is assembled by the visitor.
   */
  onDocument?: (document: DocumentNode) => DocumentNode;
  /**
   * Callback that is invoked if the extended validation yields any errors.
   */
  onValidationFailed?: OnValidationFailedCallback;
  /**
   * Reject the execution if the validation fails.
   *
   * @default true
   */
  rejectOnErrors?: boolean;
}): Plugin<PluginContext & { [symbolExtendedValidationRules]?: ExtendedValidationContext }> => {
  let schemaTypeInfo: TypeInfo;

  function getTypeInfo(): TypeInfo | undefined {
    return schemaTypeInfo;
  }

  return {
    onSchemaChange({ schema }) {
      schemaTypeInfo = new TypeInfo(schema);
    },
    onContextBuilding({ context, extendContext }) {
      // We initialize the validationRules context in onContextBuilding as onExecute is already too late!
      let validationRulesContext: undefined | ExtendedValidationContext =
        context[symbolExtendedValidationRules];
      if (validationRulesContext === undefined) {
        validationRulesContext = {
          rules: [],
          didRun: false,
        };
        extendContext({
          ...context,
          [symbolExtendedValidationRules]: validationRulesContext,
        });
      }
      validationRulesContext.rules.push(...options.rules);
    },
    onSubscribe: buildHandler(
      'subscribe',
      getTypeInfo,
      options.onDocument,
      options.onValidationFailed,
      options.rejectOnErrors !== false,
    ),
    onExecute: buildHandler(
      'execute',
      getTypeInfo,
      options.onDocument,
      options.onValidationFailed,
      options.rejectOnErrors !== false,
    ),
  };
};

function buildHandler(
  name: 'execute' | 'subscribe',
  getTypeInfo: () => TypeInfo | undefined,
  onDocument?: (document: DocumentNode) => DocumentNode,
  onValidationFailed?: OnValidationFailedCallback,
  rejectOnErrors = true,
) {
  return function handler({
    args,
    setResultAndStopExecution,
  }: OnExecuteEventPayload<any> | OnSubscribeEventPayload<any>):
    | (OnExecuteHookResult<any> & OnSubscribeHookResult<any>)
    | void {
    // We hook into onExecute/onSubscribe even though this is a validation pattern. The reasoning behind
    // it is that hooking right after validation and before execution has started is the
    // same as hooking into the validation step. The benefit of this approach is that
    // we may use execution context in the validation rules.
    const validationRulesContext: ExtendedValidationContext | undefined =
      args.contextValue[symbolExtendedValidationRules];
    if (validationRulesContext === undefined) {
      throw new Error(
        'Plugin has not been properly set up. ' +
          `The 'contextFactory' function is not invoked and the result has not been passed to '${name}'.`,
      );
    }
    // we only want to run the extended execution once.
    if (validationRulesContext.didRun === false) {
      validationRulesContext.didRun = true;
      if (validationRulesContext.rules.length !== 0) {
        const errors: GraphQLError[] = [];

        // We replicate the default validation step manually before execution starts.
        const typeInfo = getTypeInfo() ?? new TypeInfo(args.schema);
        const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
          errors.push(e);
        });

        const visitor = visitInParallel(
          validationRulesContext.rules.map(rule => rule(validationContext, args)),
        );

        args.document = visit(args.document, visitWithTypeInfo(typeInfo, visitor));
        if (onDocument) {
          args.document = onDocument(args.document);
        }

        if (errors.length > 0) {
          if (rejectOnErrors) {
            let result: ExecutionResult = {
              data: null,
              errors,
            };
            if (onValidationFailed) {
              onValidationFailed({ args, result, setResult: newResult => (result = newResult) });
            }
            setResultAndStopExecution(result);
          } else {
            // eslint-disable-next-line no-inner-declarations
            function onResult({
              result,
              setResult,
            }: {
              result: AsyncIterableIteratorOrValue<ExecutionResult>;
              setResult: (result: AsyncIterableIteratorOrValue<ExecutionResult>) => void;
            }) {
              if (isAsyncIterable(result)) {
                // rejectOnErrors is false doesn't work with async iterables
                setResult({
                  data: null,
                  errors,
                });
                return;
              }
              const newResult = {
                ...result,
                errors: [...(result.errors || []), ...errors],
              };
              function visitPath(path: readonly (string | number)[], data: any = {}) {
                let currentData = (data ||= typeof path[0] === 'number' ? [] : {});
                for (const pathItemIndex in path.slice(0, -1)) {
                  const pathItem = path[pathItemIndex];
                  currentData = currentData[pathItem] ||=
                    typeof path[Number(pathItemIndex) + 1] === 'number' ? [] : {};
                  if (Array.isArray(currentData)) {
                    let pathItemIndexInArray = Number(pathItemIndex) + 1;
                    if (path[pathItemIndexInArray] === '@') {
                      pathItemIndexInArray = Number(pathItemIndex) + 2;
                    }
                    currentData = currentData.map((c, i) =>
                      visitPath(path.slice(pathItemIndexInArray), c),
                    );
                  }
                }
                currentData[path[path.length - 1]] = null;
                return data;
              }
              errors.forEach(e => {
                if (e.path?.length) {
                  newResult.data = visitPath(e.path, newResult.data);
                }
              });
              setResult(newResult);
            }
            return {
              onSubscribeResult: onResult,
              onExecuteDone: onResult,
            };
          }
        }
      }
    }
  };
}
