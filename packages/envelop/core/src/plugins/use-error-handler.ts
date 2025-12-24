import {
  DefaultContext,
  ExecutionResult,
  IncrementalExecutionResult,
  Plugin,
  TypedExecutionArgs,
} from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';
import { isGraphQLError, SerializableGraphQLErrorLike } from './use-masked-errors.js';

export type ErrorHandler = ({
  errors,
  context,
  phase,
}: {
  errors: readonly Error[] | readonly SerializableGraphQLErrorLike[];
  context: Readonly<DefaultContext>;
  phase: 'parse' | 'validate' | 'context' | 'execution';
}) => void;

type ErrorHandlerCallback<ContextType> = {
  result: ExecutionResult | IncrementalExecutionResult;
  args: TypedExecutionArgs<ContextType>;
};

const makeHandleResult =
  <ContextType extends Record<any, any>>(errorHandler: ErrorHandler) =>
  ({ result, args }: ErrorHandlerCallback<ContextType>) => {
    const errors = result.errors ? [...result.errors] : [];
    if ('incremental' in result && result.incremental) {
      for (const increment of result.incremental) {
        if (increment.errors) {
          errors.push(...increment.errors);
        }
      }
    }

    if (errors.length) {
      errorHandler({ errors, context: args, phase: 'execution' });
    }
  };

export const useErrorHandler = <ContextType extends Record<string, any>>(
  errorHandler: ErrorHandler,
): Plugin<ContextType> => {
  const handleResult = makeHandleResult<ContextType>(errorHandler);
  return {
    onParse() {
      return function onParseEnd({ result, context }) {
        if (result instanceof Error) {
          errorHandler({ errors: [result], context, phase: 'parse' });
        }
      };
    },
    onValidate() {
      return function onValidateEnd({ valid, result, context }) {
        if (valid === false && result.length > 0) {
          errorHandler({
            errors: result as Error[],
            context,
            phase: 'validate',
          });
        }
      };
    },
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error }) => {
        if (isGraphQLError(error)) {
          errorHandler({ errors: [error], context, phase: 'context' });
        } else {
          errorHandler({
            // @ts-expect-error its not an error at this point so we just create a new one - can we handle this better?
            errors: [new Error(error)],
            context,
            phase: 'context',
          });
        }
      });
    },
    onExecute() {
      return {
        onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, handleResult);
        },
      };
    },
    onSubscribe() {
      return {
        onSubscribeResult(payload) {
          return handleStreamOrSingleExecutionResult(payload, handleResult);
        },
      };
    },
  };
};
