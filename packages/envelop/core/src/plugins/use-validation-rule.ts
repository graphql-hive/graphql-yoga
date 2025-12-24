import { Plugin } from '@envelop/types';

export const useValidationRule = (rule: any): Plugin => {
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(rule);
    },
  };
};
