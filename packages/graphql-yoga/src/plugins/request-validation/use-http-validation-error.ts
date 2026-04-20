import type { Plugin } from '../types.js';

export function useHTTPValidationError<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  PluginContext extends Record<string, any> = {},
>(): Plugin<PluginContext> {
  return {
    onValidate() {
      return ({ valid, result }) => {
        if (!valid) {
          for (const error of result) {
            // @ts-expect-error - We can safely mutate the error here, as it's a GraphQLError and we are in control of it
            const errorExtensions = error.extensions ||= {};
            errorExtensions.code ||= 'GRAPHQL_VALIDATION_FAILED';
            const httpExtensions = errorExtensions.http ||= {};
            httpExtensions.spec =
              httpExtensions.spec == null ? true : httpExtensions.spec;
            httpExtensions.status ||= 400;
          }
        }
      };
    },
  };
}
