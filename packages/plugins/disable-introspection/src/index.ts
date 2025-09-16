import { NoSchemaIntrospectionCustomRule } from 'graphql';
import type { Plugin, PromiseOrValue } from 'graphql-yoga';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

type UseDisableIntrospectionArgs = {
  isDisabled?: (request: Request, context: Record<string, unknown>) => PromiseOrValue<boolean>;
};

export function useDisableIntrospection<TContext extends Record<string, unknown>>(
  props?: UseDisableIntrospectionArgs,
): Plugin<TContext> {
  const disabledIntrospection = new WeakSet<Request>();
  return {
    onRequestParse({ request, serverContext }) {
      return handleMaybePromise(
        () => (props?.isDisabled ? props.isDisabled(request, serverContext) : true),
        result => {
          if (result) {
            disabledIntrospection.add(request);
          }
        },
      );
    },
    onValidate({ addValidationRule, context }) {
      const isDisabled = disabledIntrospection.has(context.request);
      if (isDisabled) {
        addValidationRule(NoSchemaIntrospectionCustomRule);
      }
    },
  };
}
