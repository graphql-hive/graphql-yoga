import { NoSchemaIntrospectionCustomRule } from 'graphql';
import { DefaultContext, Plugin } from '@envelop/core';

export interface DisableIntrospectionOptions {
  disableIf?: (args: {
    context: DefaultContext;
    params: Parameters<NonNullable<Plugin['onValidate']>>[0]['params'];
  }) => boolean;
}

export const useDisableIntrospection = (options?: DisableIntrospectionOptions): Plugin => {
  const disableIf = options?.disableIf;
  return {
    onValidate: disableIf
      ? ({ addValidationRule, context, params }) => {
          if (disableIf({ context, params })) {
            addValidationRule(NoSchemaIntrospectionCustomRule);
          }
        }
      : ({ addValidationRule }) => {
          addValidationRule(NoSchemaIntrospectionCustomRule);
        },
  };
};
