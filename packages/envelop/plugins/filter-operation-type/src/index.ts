import type { Plugin } from '@envelop/core';
import type { AllowedOperations } from './filter-operation-type-rule.js';
import { createFilterOperationTypeRule } from './filter-operation-type-rule.js';

export type { AllowedOperations };

export const useFilterAllowedOperations = (allowedOperations: AllowedOperations): Plugin => {
  return {
    onValidate: ({ addValidationRule }) => {
      addValidationRule(createFilterOperationTypeRule(allowedOperations));
    },
  };
};

export { createFilterOperationTypeRule };
