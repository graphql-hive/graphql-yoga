import type { DocumentNode, Source } from 'graphql';
import type { ParseOptions } from 'graphql/language/parser';
import type { Plugin } from '@envelop/core';
import { FragmentArgumentCompatibleParser } from './extended-parser.js';
import { applySelectionSetFragmentArguments } from './utils.js';

export function parseWithFragmentArguments(
  source: string | Source,
  options?: ParseOptions,
): DocumentNode {
  const parser = new FragmentArgumentCompatibleParser(source, options);

  return parser.parseDocument();
}

export const useFragmentArguments = (): Plugin => {
  return {
    onParse({ setParseFn }) {
      setParseFn(parseWithFragmentArguments);

      return ({ result, replaceParseResult }) => {
        if (result && 'kind' in result) {
          replaceParseResult(applySelectionSetFragmentArguments(result));
        }
      };
    },
  };
};
