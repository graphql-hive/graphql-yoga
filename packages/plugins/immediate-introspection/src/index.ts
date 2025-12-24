import { BREAK, ValidationRule } from 'graphql';
import type { Plugin } from '@envelop/types';

const OnNonIntrospectionFieldReachedValidationRule =
  (onNonIntrospectionField: () => void): ValidationRule =>
  ctx => {
    const rootQueryType = ctx.getSchema().getQueryType();
    const rootMutationType = ctx.getSchema().getMutationType();
    const rootSubscriptionType = ctx.getSchema().getSubscriptionType();

    return {
      Field(field) {
        const parentType = ctx.getParentType();
        const isQuery = parentType === rootQueryType;
        const isMutation = parentType === rootMutationType;
        const isSubscription = parentType === rootSubscriptionType;

        if ((isQuery && !field.name.value.startsWith('__')) || isMutation || isSubscription) {
          onNonIntrospectionField();
          return BREAK;
        }

        return undefined;
      },
    };
  };

const fastIntroSpectionSymbol = Symbol('fastIntrospection');

/**
 * In case a GraphQL operation only contains introspection fields the context building can be skipped completely.
 * With this plugin any further context extensions will be skipped.
 */
export const useImmediateIntrospection = (): Plugin<{
  [fastIntroSpectionSymbol]?: boolean;
}> => {
  return {
    onValidate({ addValidationRule }) {
      let isIntrospectionOnly = true;
      addValidationRule(
        OnNonIntrospectionFieldReachedValidationRule(() => {
          isIntrospectionOnly = false;
        }),
      );

      return function afterValidate({ extendContext }) {
        if (isIntrospectionOnly) {
          extendContext({ [fastIntroSpectionSymbol]: true });
        }
      };
    },
    onContextBuilding({ context, breakContextBuilding }) {
      if (context[fastIntroSpectionSymbol]) {
        // hijack and skip all other context related stuff.
        // We dont need a context!
        breakContextBuilding();
      }
    },
  };
};
