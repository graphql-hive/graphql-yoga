import { ExecutionResult, Plugin, TypedExecutionArgs } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export type FormatterFunction = (
  result: ExecutionResult<any, any>,
  args: TypedExecutionArgs<any>,
) => false | ExecutionResult<any, any>;

const makeHandleResult =
  (formatter: FormatterFunction) =>
  ({
    args,
    result,
    setResult,
  }: {
    args: TypedExecutionArgs<any>;
    result: ExecutionResult;
    setResult: (result: ExecutionResult) => void;
  }) => {
    const modified = formatter(result, args);
    if (modified !== false) {
      setResult(modified);
    }
  };

export const usePayloadFormatter = (formatter: FormatterFunction): Plugin => ({
  onExecute() {
    const handleResult = makeHandleResult(formatter);
    return {
      onExecuteDone(payload) {
        return handleStreamOrSingleExecutionResult(payload, handleResult);
      },
    };
  },
});
