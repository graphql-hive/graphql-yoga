import type { PromiseOrValue } from '@envelop/core';
import { GraphQLParams } from '../types.js';
import { Plugin } from './types.js';

interface RequestParserPluginOptions {
  match?(request: Request): boolean;
  parse(request: Request): PromiseOrValue<GraphQLParams> | PromiseOrValue<GraphQLParams[]>;
}

const DEFAULT_MATCHER = () => true;

export function useRequestParser(options: RequestParserPluginOptions): Plugin {
  const matchFn = options.match || DEFAULT_MATCHER;
  return {
    onRequestParse({ request, setRequestParser }) {
      if (matchFn(request)) {
        setRequestParser(options.parse);
      }
    },
  };
}
