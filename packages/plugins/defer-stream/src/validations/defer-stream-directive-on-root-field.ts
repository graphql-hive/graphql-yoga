import { ASTVisitor, ValidationContext } from 'graphql';
import { createGraphQLError } from 'graphql-yoga';
import { GraphQLDeferDirective, GraphQLStreamDirective } from '@graphql-tools/utils';

/**
 * Stream directive on list field
 *
 * A GraphQL document is only valid if defer directives are not used on root mutation or subscription types.
 */
export function DeferStreamDirectiveOnRootFieldRule(context: ValidationContext): ASTVisitor {
  return {
    Directive(node) {
      const mutationType = context.getSchema().getMutationType();
      const subscriptionType = context.getSchema().getSubscriptionType();
      const parentType = context.getParentType();
      if (parentType && node.name.value === GraphQLDeferDirective.name) {
        if (mutationType && parentType === mutationType) {
          context.reportError(
            createGraphQLError(
              `Defer directive cannot be used on root mutation type "${parentType.name}".`,
              { nodes: node },
            ),
          );
        }
        if (subscriptionType && parentType === subscriptionType) {
          context.reportError(
            createGraphQLError(
              `Defer directive cannot be used on root subscription type "${parentType.name}".`,
              { nodes: node },
            ),
          );
        }
      }
      if (parentType && node.name.value === GraphQLStreamDirective.name) {
        if (mutationType && parentType === mutationType) {
          context.reportError(
            createGraphQLError(
              `Stream directive cannot be used on root mutation type "${parentType.name}".`,
              { nodes: node },
            ),
          );
        }
        if (subscriptionType && parentType === subscriptionType) {
          context.reportError(
            createGraphQLError(
              `Stream directive cannot be used on root subscription type "${parentType.name}".`,
              { nodes: node },
            ),
          );
        }
      }
    },
  };
}
