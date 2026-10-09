import type { ExecutionResult, Plugin, TypedExecutionArgs } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export type MaskError<ContextType = any> = (
  error: unknown,
  message: string,
  context?: ContextType,
) => Error;

export type SerializableGraphQLErrorLike = Error & {
  name: 'GraphQLError';
  toJSON(): { message: string };
  extensions?: Record<string, unknown>;
};

export function isGraphQLError(error: unknown): error is Error & { originalError?: Error } {
  return error instanceof Error && error.name === 'GraphQLError';
}

export function isOriginalGraphQLError(error: unknown): error is Error & { originalError?: Error } {
  if (isGraphQLError(error)) {
    if (error.originalError != null) {
      return isOriginalGraphQLError(error.originalError);
    }
    return true;
  }
  return false;
}

function createSerializableGraphQLError(
  message: string,
  originalError: unknown,
  isDev: boolean,
): SerializableGraphQLErrorLike {
  const error = new Error(message) as SerializableGraphQLErrorLike;
  error.name = 'GraphQLError';
  if (isDev) {
    const extensions =
      originalError instanceof Error
        ? { message: originalError.message, stack: originalError.stack }
        : { message: String(originalError) };

    Object.defineProperty(error, 'extensions', {
      get() {
        return extensions;
      },
    });
  }

  Object.defineProperty(error, 'toJSON', {
    value() {
      return {
        message: error.message,
        extensions: error.extensions,
      };
    },
  });

  return error as SerializableGraphQLErrorLike;
}

export const createDefaultMaskError =
  (isDev: boolean): MaskError =>
  (error, message) => {
    if (isOriginalGraphQLError(error)) {
      return error;
    }
    return createSerializableGraphQLError(message, error, isDev);
  };

const isDev = globalThis.process?.env?.['NODE_ENV'] === 'development';

export const defaultMaskError: MaskError = createDefaultMaskError(isDev);

export type UseMaskedErrorsOpts<ContextType = any> = {
  /** The function used for identify and mask errors. */
  maskError?: MaskError<ContextType>;
  /** The error message that shall be used for masked errors. */
  errorMessage?: string;
};

const makeHandleResult =
  <ContextType>(maskError: MaskError<ContextType>, message: string) =>
  ({
    args,
    result,
    setResult,
  }: {
    args: TypedExecutionArgs<ContextType>;
    result: ExecutionResult;
    setResult: (result: ExecutionResult) => void;
  }) => {
    if (result.errors != null) {
      setResult({
        ...result,
        errors: result.errors.map(error => maskError(error, message, args.contextValue)),
      });
    }
  };

export function useMaskedErrors<PluginContext extends Record<string, any> = {}>(
  opts?: UseMaskedErrorsOpts<PluginContext>,
): Plugin<PluginContext> {
  const maskError = opts?.maskError ?? defaultMaskError;
  const message = opts?.errorMessage || DEFAULT_ERROR_MESSAGE;
  const handleResult = makeHandleResult(maskError, message);

  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError, context: ctx }) => {
        setError(maskError(error, message, ctx as PluginContext));
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
        onSubscribeError({ error, setError, context }) {
          setError(maskError(error, message, context));
        },
      };
    },
  };
}
