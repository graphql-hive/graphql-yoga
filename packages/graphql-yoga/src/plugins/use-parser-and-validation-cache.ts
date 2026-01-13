import type { DocumentNode, GraphQLError, GraphQLSchema, ValidationRule } from 'graphql';
import type { AfterValidateHook } from '@envelop/core';
import { ParserAndValidationCacheOptions } from '@graphql-yoga/types';
import { _createLRUCache } from '../utils/create-lru-cache.js';
import type { Plugin } from './types.js';

export function useParserAndValidationCache({
  documentCache = _createLRUCache(),
  errorCache = _createLRUCache(),
  validationCache = true,
}: ParserAndValidationCacheOptions): Plugin<{}> {
  const validationCacheByRules =
    _createLRUCache<WeakMap<GraphQLSchema, WeakMap<DocumentNode, GraphQLError[]>>>();
  return {
    onParse({ params, setParsedDocument }) {
      const strDocument = params.source.toString();
      const document = documentCache.get(strDocument);
      if (document) {
        setParsedDocument(document);
        return;
      }
      const parserError = errorCache.get(strDocument);
      if (parserError) {
        throw parserError;
      }
      return ({ result }) => {
        if (result != null) {
          if (result instanceof Error) {
            errorCache.set(strDocument, result);
          } else {
            documentCache.set(strDocument, result);
          }
        }
      };
    },
    onValidate({
      params: { schema, documentAST, rules },
      setResult,
    }): void | AfterValidateHook<{}> {
      /** No schema no cache */
      if (schema == null) {
        return;
      }

      if (validationCache !== false) {
        const rulesKey = rules?.map((rule: ValidationRule) => rule.name).join(',') || '';
        let validationCacheBySchema = validationCacheByRules.get(rulesKey);
        if (!validationCacheBySchema) {
          validationCacheBySchema = new WeakMap();
          validationCacheByRules.set(rulesKey, validationCacheBySchema);
        }
        let validationCacheByDocument = validationCacheBySchema.get(schema);
        if (!validationCacheByDocument) {
          validationCacheByDocument = new WeakMap();
          validationCacheBySchema.set(schema, validationCacheByDocument);
        }
        const cachedResult = validationCacheByDocument.get(documentAST);
        if (cachedResult) {
          setResult(cachedResult);
          return;
        }
        return ({ result }) => {
          if (result != null) {
            validationCacheByDocument?.set(documentAST, result as GraphQLError[]);
          }
        };
      }
    },
  };
}
