import {
  ExecuteFunction,
  ParseFunction,
  Plugin,
  SubscribeFunction,
  ValidateFunction,
} from '@envelop/types';

type UseEngineOptions = {
  execute?: ExecuteFunction;
  parse?: ParseFunction;
  validate?: ValidateFunction;
  specifiedRules?: readonly any[];
  subscribe?: SubscribeFunction;
};

export const useEngine = (engine: UseEngineOptions): Plugin => {
  return {
    onExecute: ({ setExecuteFn }) => {
      if (engine.execute) {
        setExecuteFn(engine.execute);
      }
    },
    onParse: ({ setParseFn }) => {
      if (engine.parse) {
        setParseFn(engine.parse);
      }
    },
    onValidate: ({ setValidationFn, addValidationRule }) => {
      if (engine.validate) {
        setValidationFn(engine.validate);
      }
      engine.specifiedRules?.map(addValidationRule);
    },
    onSubscribe: ({ setSubscribeFn }) => {
      if (engine.subscribe) {
        setSubscribeFn(engine.subscribe);
      }
    },
  };
};
