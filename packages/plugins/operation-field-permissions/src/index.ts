import {
  FieldNode,
  getNamedType,
  GraphQLError,
  GraphQLObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isUnionType,
} from 'graphql';
import { Plugin, PromiseOrValue, useExtendContext } from '@envelop/core';
import { ExtendedValidationRule, useExtendedValidation } from '@envelop/extended-validation';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

const OPERATION_PERMISSIONS_SYMBOL = Symbol('OPERATION_PERMISSIONS_SYMBOL');

/**
 * Returns a set of type names that allow access to all fields in the type.
 */
const getWildcardTypes = (scope: Set<string>): Set<string> => {
  const wildcardTypes = new Set<string>();
  for (const item of scope) {
    if (item.endsWith('*')) {
      const [typeName] = item.split('.');
      wildcardTypes.add(typeName);
    }
  }
  return wildcardTypes;
};

const toSet = (input: string | Set<string>) =>
  typeof input === 'string' ? new Set([input]) : input;

type ScopeContext = {
  allowAll: boolean;
  wildcardTypes: Set<string>;
  schemaCoordinates: Set<string>;
};

const getContext = (input: unknown): ScopeContext => {
  if (typeof input !== 'object' || !input || !(OPERATION_PERMISSIONS_SYMBOL in input)) {
    throw new Error('OperationScopeRule was used without context.');
  }
  return input[OPERATION_PERMISSIONS_SYMBOL] as ScopeContext;
};

type OperationScopeRuleOptions = {
  formatError: (schemaCoordinate: string) => string;
};

/**
 * Validate whether a user is allowed to execute a certain GraphQL operation.
 */
const OperationScopeRule =
  (options: OperationScopeRuleOptions): ExtendedValidationRule =>
  (context, executionArgs) => {
    const permissionContext = getContext(executionArgs.contextValue);

    const handleField = (node: FieldNode, objectType: GraphQLObjectType) => {
      const schemaCoordinate = `${objectType.name}.${node.name.value}`;

      if (
        !permissionContext.allowAll &&
        !permissionContext.wildcardTypes.has(objectType.name) &&
        !permissionContext.schemaCoordinates.has(schemaCoordinate)
      ) {
        // We should use GraphQLError once the object constructor lands in stable GraphQL.js
        // and useMaskedErrors supports it.
        const error = new GraphQLError(options.formatError(schemaCoordinate));
        (error as any).nodes = [node];
        context.reportError(error);
      }
    };

    return {
      Field(node) {
        const type = context.getType();
        if (type) {
          const namedType = getNamedType(type);
          if (isIntrospectionType(namedType)) {
            return false;
          }
        }

        const parentType = context.getParentType();
        if (parentType) {
          if (isIntrospectionType(parentType)) {
            return false;
          }

          // We handle objects, interface and union permissions differently.
          // When accessing an an object field, we check simply run the check.
          if (isObjectType(parentType)) {
            handleField(node, parentType);
          }

          // To allow a union case, every type in the union has to be allowed/
          // If one of the types doesn't permit access we should throw a validation error.
          if (isUnionType(parentType)) {
            for (const objectType of parentType.getTypes()) {
              handleField(node, objectType);
            }
          }

          // Same goes for interfaces. Every implementation should allow the access of the given
          // field to pass the validation rule.
          if (isInterfaceType(parentType)) {
            for (const objectType of executionArgs.schema.getImplementations(parentType).objects) {
              handleField(node, objectType);
            }
          }
        }

        return undefined;
      },
    };
  };

type OperationScopeOptions<TContext> = {
  getPermissions: (context: TContext) => PromiseOrValue<Set<string> | string>;
  formatError?: OperationScopeRuleOptions['formatError'];
};

const defaultFormatError = (schemaCoordinate: string) =>
  `Insufficient permissions for selecting '${schemaCoordinate}'.`;

export const useOperationFieldPermissions = <TContext>(
  opts: OperationScopeOptions<TContext>,
): Plugin<{ [OPERATION_PERMISSIONS_SYMBOL]: ScopeContext }> => {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            OperationScopeRule({
              formatError: opts.formatError ?? defaultFormatError,
            }),
          ],
        }),
      );

      addPlugin(
        useExtendContext(context =>
          handleMaybePromise(
            () => opts.getPermissions(context as TContext),
            permissions => {
              // Schema coordinates is a set of type-name field-name strings that
              // describe the position of a field in the schema.
              const schemaCoordinates = toSet(permissions);
              const wildcardTypes = getWildcardTypes(schemaCoordinates);

              const scopeContext: ScopeContext = {
                schemaCoordinates,
                wildcardTypes,
                allowAll: schemaCoordinates.has('*'),
              };

              return {
                [OPERATION_PERMISSIONS_SYMBOL]: scopeContext,
              };
            },
          ),
        ),
      );
    },
  };
};
