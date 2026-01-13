import type { Plugin } from '@graphql-yoga/types';

export function useHTTPValidationError<
  PluginContext extends Record<string, any> = {},
>(): Plugin<PluginContext> {
  return {
    onValidate() {
      return ({ valid, result }) => {
        if (!valid) {
          for (const error of result) {
            error.extensions ||= {};
            error.extensions.code ||= 'GRAPHQL_VALIDATION_FAILED';
            error.extensions.http ||= {};
            error.extensions.http.spec =
              error.extensions.http.spec == null ? true : error.extensions.http.spec;
            error.extensions.http.status ||= 400;
          }
        }
      };
    },
  };
}
