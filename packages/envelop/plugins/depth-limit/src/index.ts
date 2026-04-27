import depthLimit from 'graphql-depth-limit';
import type { Plugin } from '@envelop/core';

export type DepthLimitConfig = { maxDepth: number; ignore?: string[] };

export const useDepthLimit = (config: DepthLimitConfig): Plugin => {
  const ignore = config.ignore || [];
  const checkFn = depthLimit(config.maxDepth, { ignore });

  return {
    onValidate({ addValidationRule }) {
      addValidationRule(checkFn);
    },
  };
};
