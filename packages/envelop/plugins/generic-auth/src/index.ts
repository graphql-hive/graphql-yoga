import type {
  ExecutionArgs,
  ExecutionResult,
  FieldNode,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql';
import {
  defaultFieldResolver,
  getNamedType,
  getOperationAST,
  getVariableValues,
  GraphQLError,
  isAbstractType,
  isInterfaceType,
  isIntrospectionType,
  isListType,
  isObjectType,
  isUnionType,
  Kind,
  responsePathAsArray,
} from 'graphql';
import type { DefaultContext, Maybe, Plugin, PromiseOrValue } from '@envelop/core';
import { isAsyncIterable } from '@envelop/core';
import { useExtendedValidation } from '@envelop/extended-validation';
import type { VariableValues } from '@graphql-tools/utils';
import {
  coerceGetVariableValuesResult,
  getDefinedRootType,
  getDirectiveExtensions,
  shouldIncludeNode,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { removeEmptyOrUnusedNodes } from './utils.js';

export type ResolveUserFn<UserType, ContextType = DefaultContext> = (
  context: ContextType,
) => PromiseOrValue<Maybe<UserType>>;

export type ValidateUserFnParams<UserType> = {
  /** The user object. */
  user: UserType;
  /** The field node from the operation that is being validated. */
  fieldNode: FieldNode;
  /** The parent type which has the field that is being validated. */
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  /** The auth directive arguments for the type */
  typeAuthArgs?: Record<string, any>;
  /** The directives for the type */
  typeDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that type requires */
  typeScopes?: string[][];
  /** Policies that type requires */
  typePolicies?: string[][];
  /** The object field */
  field: GraphQLField<any, any>;
  /** The auth directive arguments for the field */
  fieldAuthArgs?: Record<string, any>;
  /** The directives for the field */
  fieldDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that field requires */
  fieldScopes?: string[][];
  /** Policies that field requires */
  fieldPolicies?: string[][];
  /** Extracted scopes from the user object */
  userScopes: string[];
  /** Policies for the user */
  userPolicies: string[];
  /** The args passed to the execution function (including operation context and variables) **/
  executionArgs: ExecutionArgs;
  /** Resolve path */
  path: ReadonlyArray<string | number>;
};

export type ValidateUserFn<UserType> = (
  params: ValidateUserFnParams<UserType>,
) => void | GraphQLError;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE
`;

export const SKIP_AUTH_DIRECTIVE_SDL = /* GraphQL */ `
  directive @skipAuth on FIELD_DEFINITION | OBJECT | INTERFACE
`;

export const REQUIRES_SCOPES_DIRECTIVE_SDL = /* GraphQL */ `
  directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE
`;

export const POLICY_DIRECTIVE_SDL = /* GraphQL */ `
  directive @policy(policies: [String!]!) on FIELD_DEFINITION | OBJECT | INTERFACE
`;

export type GenericAuthPluginOptions<
  UserType extends {} = {},
  ContextType = DefaultContext,
  CurrentUserKey extends string = 'currentUser',
> = {
  /**
   * Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
   * to find the current user.
   * Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
   * Make sure to either return `null` or the user object.
   */
  resolveUserFn: ResolveUserFn<UserType, ContextType>;
  /**
   * Overrides the default field name for injecting the user into the execution `context`.
   * @default currentUser
   */
  contextFieldName?: CurrentUserKey;
  /**
   * Overrides the default directive name for marking a field that requires specific scopes.
   *
   * @default requiresScopes
   */
  scopesDirectiveName?: 'requiresScopes';
  /**
   * Extracts the scopes from the user object.
   *
   * @default defaultExtractScopes
   */
  extractScopes?(user: UserType): string[];
  /**
   * Overrides the default directive name for @policy directive
   *
   * @default policy
   */
  policyDirectiveName?: string;
  /**
   * Extracts the policies for the user object.
   */
  extractPolicies?(user: UserType, context: ContextType): PromiseOrValue<string[]>;
} & (
  | {
      /**
       * This mode offers complete protection for the entire API.
       * It protects your entire GraphQL schema, by validating the user before executing the request.
       * You can skip the validation using `@skipAuth` directive on a specific field.
       */
      mode: 'protect-all';
      /**
       * Overrides the default directive name or extension field for marking a field available for unauthorized users.
       * @default skipAuth
       */
      authDirectiveName?: 'skipAuth' | string;
      /**
       * Customize how the user is validated. E.g. apply authorization role based validation.
       * The validation is applied during the extended validation phase.
       * @default `defaultProtectAllValidateFn`
       */
      validateUser?: ValidateUserFn<UserType>;
    }
  | {
      /**
       * Just resolves the user and inject to authenticated user into the `context`.
       * User validation needs to be implemented by you, in your resolvers.
       */
      mode: 'resolve-only';
    }
  | {
      /**
       * resolves the user and inject to authenticated user into the `context`.
       * And checks for `@auth` directives usages to run validation automatically.
       */
      mode: 'protect-granular';
      /**
       * Overrides the default directive name or extension field for marking a field available only for authorized users.
       * @default authenticated
       */
      authDirectiveName?: 'authenticated' | string;
      /**
       * Customize how the user is validated. E.g. apply authorization role based validation.
       * The validation is applied during the extended validation phase.
       * @default `defaultProtectSingleValidateFn`
       */
      validateUser?: ValidateUserFn<UserType>;
      /**
       * Reject on unauthenticated requests.
       * @default true
       */
      rejectUnauthenticated?: boolean;
    }
);

export function createUnauthenticatedError(params?: {
  fieldNode?: FieldNode;
  path?: ReadonlyArray<string | number>;
  message?: string;
  statusCode?: number;
}) {
  return new GraphQLError(params?.message ?? 'Unauthorized field or type', {
    nodes: params?.fieldNode ? [params.fieldNode] : undefined,
    path: params?.path,
    extensions: {
      code: 'UNAUTHORIZED_FIELD_OR_TYPE',
      http: {
        status: params?.statusCode ?? 401,
      },
    },
  });
}

export function defaultProtectAllValidateFn<UserType>(
  params: ValidateUserFnParams<UserType>,
): void | GraphQLError {
  if (params.user == null && !params.fieldAuthArgs && !params.typeAuthArgs) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  return validateScopesAndPolicies(params);
}

function areRolesValid(requiredRoles: string[][], userRoles: string[]) {
  for (const roles of requiredRoles) {
    if (roles.every(role => userRoles.includes(role))) {
      return true;
    }
  }
  return false;
}

function validateRoles<UserType>(
  params: ValidateUserFnParams<UserType>,
  requiredRoles: string[][],
  userRoles: string[],
): void | GraphQLError {
  if (!areRolesValid(requiredRoles, userRoles)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
}

function validateScopesAndPolicies<UserType>(
  params: ValidateUserFnParams<UserType>,
): void | GraphQLError {
  if (params.typeScopes) {
    const error = validateRoles(params, params.typeScopes, params.userScopes);
    if (error) {
      return error;
    }
  }
  // an explicitly declared empty list is unsatisfiable, so only skip when nothing was declared
  if (params.typePolicies) {
    const error = validateRoles(params, params.typePolicies, params.userPolicies);
    if (error) {
      return error;
    }
  }
  if (params.fieldScopes) {
    const error = validateRoles(params, params.fieldScopes, params.userScopes);
    if (error) {
      return error;
    }
  }
  if (params.fieldPolicies) {
    const error = validateRoles(params, params.fieldPolicies, params.userPolicies);
    if (error) {
      return error;
    }
  }
}
export function defaultProtectSingleValidateFn<UserType>(
  params: ValidateUserFnParams<UserType>,
): void | GraphQLError {
  if (params.user == null && (params.fieldAuthArgs || params.typeAuthArgs)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  return validateScopesAndPolicies(params);
}

// Walks the full interface hierarchy, not just the type's own `getInterfaces()`: an interface can
// itself implement further interfaces, and a concrete type only has to list its direct ones.
function getImplementedInterfaces(
  type: GraphQLObjectType | GraphQLInterfaceType,
): readonly GraphQLInterfaceType[] {
  const seen = new Set<GraphQLInterfaceType>();
  const queue = [...type.getInterfaces()];
  while (queue.length > 0) {
    const iface = queue.shift()!;
    if (seen.has(iface)) {
      continue;
    }
    seen.add(iface);
    queue.push(...iface.getInterfaces());
  }
  return [...seen];
}

function mergeDirectiveExtensions(
  base: ReturnType<typeof getDirectiveExtensions>,
  extra: ReturnType<typeof getDirectiveExtensions>,
): ReturnType<typeof getDirectiveExtensions> {
  const merged = { ...base };
  for (const directiveName of Object.keys(extra)) {
    // Concatenate rather than keep-first: each entry is one declaration of the directive, and an
    // interface's declaration must not be dropped just because another interface declared the
    // same directive name first.
    merged[directiveName] = [...(merged[directiveName] ?? []), ...(extra[directiveName] ?? [])];
  }
  return merged;
}

function combineRequirementGroups(
  groups: ReadonlyArray<string[][] | undefined>,
): string[][] | undefined {
  // `undefined` = source doesn't declare the directive, so it's excluded. `[]` = source declares
  // it as unsatisfiable, which must propagate: the cross-product below keeps producing `[]` once
  // one is present, rather than reverting to "no requirement".
  const declared = groups.filter((group): group is string[][] => group !== undefined);
  if (declared.length === 0) {
    return undefined;
  }
  return declared.reduce((combined, current) => {
    const product: string[][] = [];
    for (const combinedGroup of combined) {
      for (const currentGroup of current) {
        product.push([...new Set([...combinedGroup, ...currentGroup])]);
      }
    }
    return product;
  });
}

function getRequirementGroups(
  directives: ReturnType<typeof getDirectiveExtensions>,
  directiveName: string,
  argName: string,
): string[][] | undefined {
  return directives[directiveName]?.[0]?.[argName];
}

// Resolves the auth-marker directive's args (e.g. `@skipAuth`/`@authenticated`) across the
// field's own declaration plus every implemented interface that also declares it.
//
// Not declaring it isn't a vote, since types aren't required to redeclare what their interfaces
// say. Polarity decides how declarations combine: restrictive directives (`@authenticated`) apply
// if ANY source declares them, and every distinct declaration (own included) is returned so that
// each one's args (e.g. a required role) get validated, since an own declaration must not be able
// to loosen what an interface requires. For permissive ones (`@skipAuth`) an own declaration wins
// outright, since it's a deliberate override; otherwise they apply only if EVERY declaring
// interface agrees (AND), since one lenient interface shouldn't waive a restriction another
// interface intends.
//
// Returns the list of args to validate with, where `undefined` means "not declared".
function resolveAuthArgs(
  ownArgs: Record<string, any> | undefined,
  interfaceArgs: ReadonlyArray<Record<string, any> | undefined>,
  isPermissive: boolean,
): Array<Record<string, any> | undefined> {
  if (isPermissive) {
    if (ownArgs) {
      return [ownArgs];
    }
    return [
      interfaceArgs.length > 0 && interfaceArgs.every(Boolean) ? interfaceArgs[0] : undefined,
    ];
  }
  const distinct = new Map<string, Record<string, any>>();
  for (const args of [ownArgs, ...interfaceArgs]) {
    if (args) {
      distinct.set(JSON.stringify(args), args);
    }
  }
  return distinct.size > 0 ? [...distinct.values()] : [undefined];
}

type RuntimeAuthState = {
  /** `Type.field` coordinates selected through an interface that the object type would deny. */
  checks: Set<string>;
  /** Whether a runtime check denied a field since the last delivered result. */
  denied: boolean;
  fieldResolver: Maybe<GraphQLFieldResolver<any, any>>;
  validate: (
    fieldNode: FieldNode,
    parentType: GraphQLObjectType,
    path: ReadonlyArray<string | number>,
  ) => void | GraphQLError;
};

export function defaultExtractScopes<UserType>(user: UserType): string[] {
  if (user != null && typeof user === 'object' && 'scope' in user) {
    if (typeof user.scope === 'string') {
      return user.scope.split(' ');
    }
    if (Array.isArray(user.scope)) {
      return user.scope;
    }
  }
  return [];
}

export const useGenericAuth = <
  UserType extends {} = {},
  ContextType extends Record<any, any> = DefaultContext,
  CurrentUserKey extends string = 'currentUser',
>(
  options: GenericAuthPluginOptions<UserType, ContextType, CurrentUserKey>,
): Plugin<
  {
    validateUser: ValidateUserFn<UserType>;
  } & Record<CurrentUserKey, UserType>
> => {
  const contextFieldName = options.contextFieldName || 'currentUser';

  if (options.mode === 'protect-all' || options.mode === 'protect-granular') {
    const authDirectiveName =
      options.authDirectiveName ?? (options.mode === 'protect-all' ? 'skipAuth' : 'authenticated');
    const authDirectiveIsPermissive = options.mode === 'protect-all';
    const requiresScopesDirectiveName = options.scopesDirectiveName ?? 'requiresScopes';
    const policyDirectiveName = options.policyDirectiveName ?? 'policy';
    const validateUser =
      options.validateUser ??
      (options.mode === 'protect-all'
        ? defaultProtectAllValidateFn
        : defaultProtectSingleValidateFn);
    const extractScopes = options.extractScopes ?? defaultExtractScopes;

    const rejectUnauthenticated =
      'rejectUnauthenticated' in options ? options.rejectUnauthenticated !== false : true;

    const policiesByContext = new WeakMap<ContextType, string[]>();
    // runtime state lives on the operation nodes of the executed document and every execution
    // validates its own copy of them, so resolvers get exactly their execution's state through
    // `info.operation` even when executions share a context or a parsed document
    const runtimeStateSymbol = Symbol('genericAuthRuntimeState');
    const getRuntimeState = (operation: Maybe<OperationDefinitionNode>) =>
      (operation as { [runtimeStateSymbol]?: RuntimeAuthState } | null | undefined)?.[
        runtimeStateSymbol
      ];
    const wrappedResolverSymbol = Symbol('genericAuthWrappedResolver');
    const rejectRuntimeDenial = (
      args: ExecutionArgs,
      {
        result,
        setResult,
      }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void },
    ) => {
      const state = getRuntimeState(getOperationAST(args.document, args.operationName));
      // incremental delivery payloads without `data` keep their field errors instead
      if (state?.denied && 'data' in result) {
        state.denied = false;
        setResult({ ...result, data: null });
      }
    };
    return {
      onSchemaChange({ schema }) {
        // Fields that implement an interface field can be selected through the interface, where
        // the object's actual type is only known during execution. Wrap their resolvers so that
        // objects whose type denies the field are rejected when they are actually resolved.
        for (const type of Object.values((schema as GraphQLSchema).getTypeMap())) {
          if (!isObjectType(type) || isIntrospectionType(type)) {
            continue;
          }
          const fields = type.getFields();
          for (const iface of getImplementedInterfaces(type)) {
            for (const fieldName of Object.keys(iface.getFields())) {
              const field = fields[fieldName] as
                | (GraphQLField<any, any> & { [wrappedResolverSymbol]?: true })
                | undefined;
              if (!field || field[wrappedResolverSymbol]) {
                continue;
              }
              const resolve = field.resolve;
              field.resolve = (root, fieldArgs, context, info) => {
                const state = getRuntimeState(info.operation);
                if (
                  state?.checks.size &&
                  state.checks.has(`${info.parentType.name}.${info.fieldName}`)
                ) {
                  for (const fieldNode of info.fieldNodes) {
                    const error = state.validate(
                      fieldNode,
                      info.parentType,
                      responsePathAsArray(info.path),
                    );
                    if (error) {
                      state.denied = true;
                      throw error;
                    }
                  }
                }
                // an unset resolver means the execution's field resolver, keep honoring it.
                // executions that skipped the plugin don't expose theirs, so they get the default
                return (resolve ?? state?.fieldResolver ?? defaultFieldResolver)(
                  root,
                  fieldArgs,
                  context,
                  info,
                );
              };
              field[wrappedResolverSymbol] = true;
            }
          }
        }
      },
      onExecute({ args }) {
        if (rejectUnauthenticated) {
          return {
            onExecuteDone(payload) {
              if (isAsyncIterable(payload.result)) {
                return { onNext: next => rejectRuntimeDenial(args, next) };
              }
              rejectRuntimeDenial(args, {
                result: payload.result,
                setResult: payload.setResult,
              });
              return undefined;
            },
          };
        }
        return undefined;
      },
      onSubscribe({ args }) {
        if (rejectUnauthenticated) {
          return {
            onSubscribeResult(payload) {
              if (isAsyncIterable(payload.result)) {
                return { onNext: next => rejectRuntimeDenial(args, next) };
              }
              rejectRuntimeDenial(args, {
                result: payload.result,
                setResult: payload.setResult,
              });
              return undefined;
            },
          };
        }
        return undefined;
      },
      onPluginInit({ addPlugin }) {
        addPlugin(
          useExtendedValidation({
            rejectOnErrors: rejectUnauthenticated,
            onDocument: removeEmptyOrUnusedNodes,
            rules: [
              function AuthorizationExtendedValidationRule(context, args) {
                const user = (args.contextValue as any)[contextFieldName];

                const schema = context.getSchema();
                const operationAST = getOperationAST(args.document, args.operationName);
                const variableDefinitions = operationAST?.variableDefinitions;
                const coercedVariables = coerceGetVariableValuesResult(
                  getVariableValues(schema, variableDefinitions ?? [], args.variableValues || {}),
                );
                // Fail closed: invalid variables must not skip @include/@skip and auth-check
                // fields that would never execute.
                if ('errors' in coercedVariables) {
                  for (const error of coercedVariables.errors) {
                    context.reportError(error);
                  }
                  return {};
                }
                const { variableValues } = coercedVariables;
                const operationType = operationAST?.operation ?? ('query' as OperationTypeNode);

                const fragmentPaths = new Map<string, ReadonlyArray<string | number>>();

                function getResolvePath(
                  path: readonly (string | number)[],
                  currType: GraphQLObjectType,
                ): (string | number)[] {
                  const resolvePath: (string | number)[] = [];
                  let curr: any = args.document;
                  for (const pathItem of path) {
                    curr = curr[pathItem];
                    if (curr?.kind === 'Field') {
                      const fieldName = curr.name.value;
                      const responseKey = curr.alias?.value ?? fieldName;
                      let field: GraphQLField<any, any> | undefined;
                      if (isObjectType(currType)) {
                        field = currType.getFields()[fieldName];
                      } else if (isAbstractType(currType)) {
                        for (const possibleType of schema.getPossibleTypes(currType)) {
                          field = possibleType.getFields()[fieldName];
                          if (field) {
                            break;
                          }
                        }
                      }
                      if (isListType(field?.type)) {
                        resolvePath.push('@');
                      }
                      resolvePath.push(responseKey);
                      if (field?.type) {
                        currType = getNamedType(field.type) as GraphQLObjectType;
                      }
                    } else if (curr?.kind === 'FragmentDefinition') {
                      currType = schema.getType(curr.typeCondition.name.value) as GraphQLObjectType;
                      const fragmentPath = fragmentPaths.get(curr.name.value);
                      if (fragmentPath) {
                        resolvePath.push(...fragmentPath);
                      }
                    }
                  }
                  return resolvePath;
                }

                const handleField = (
                  fieldNode: FieldNode,
                  parentType: GraphQLInterfaceType | GraphQLObjectType,
                  resolvePath: ReadonlyArray<string | number>,
                ) => {
                  const field = parentType.getFields()[fieldNode.name.value];
                  if (field == null) {
                    // field is null/undefined if this is an introspection field
                    return;
                  }

                  // A concrete object type is not required to redeclare directives present on
                  // an interface field it implements. Fall back to the implemented interfaces'
                  // (and their interfaces', transitively) directives so that selecting a field
                  // through an inline fragment on a concrete type can't bypass authorization
                  // that was declared on the interface.
                  const inheritedInterfaces = getImplementedInterfaces(parentType);

                  const ownTypeDirectives = getDirectiveExtensions(parentType, schema);
                  const ownFieldDirectives = getDirectiveExtensions(field, schema);

                  let typeDirectives = ownTypeDirectives;
                  let fieldDirectives = ownFieldDirectives;
                  const ownTypeAuthArgs = ownTypeDirectives[authDirectiveName]?.[0];
                  const ownFieldAuthArgs = ownFieldDirectives[authDirectiveName]?.[0];
                  const typeInterfaceAuthArgs: Array<Record<string, any> | undefined> = [];
                  const fieldInterfaceAuthArgs: Array<Record<string, any> | undefined> = [];
                  const typeScopeSources: Array<string[][] | undefined> = [
                    getRequirementGroups(ownTypeDirectives, requiresScopesDirectiveName, 'scopes'),
                  ];
                  const typePolicySources: Array<string[][] | undefined> = [
                    getRequirementGroups(ownTypeDirectives, policyDirectiveName, 'policies'),
                  ];
                  const fieldScopeSources: Array<string[][] | undefined> = [
                    getRequirementGroups(ownFieldDirectives, requiresScopesDirectiveName, 'scopes'),
                  ];
                  const fieldPolicySources: Array<string[][] | undefined> = [
                    getRequirementGroups(ownFieldDirectives, policyDirectiveName, 'policies'),
                  ];

                  for (const iface of inheritedInterfaces) {
                    // Only inherit an interface's directives (type-level included) for a field
                    // that the interface itself declares. Otherwise a type-level directive like
                    // @skipAuth would leak onto fields the concrete type added on its own, which
                    // the interface never intended to cover.
                    const ifaceField = iface.getFields()[fieldNode.name.value];
                    if (!ifaceField) {
                      continue;
                    }
                    const ifaceTypeDirectives = getDirectiveExtensions(iface, schema);
                    const ifaceFieldDirectives = getDirectiveExtensions(ifaceField, schema);
                    typeDirectives = mergeDirectiveExtensions(typeDirectives, ifaceTypeDirectives);
                    fieldDirectives = mergeDirectiveExtensions(
                      fieldDirectives,
                      ifaceFieldDirectives,
                    );
                    typeInterfaceAuthArgs.push(ifaceTypeDirectives[authDirectiveName]?.[0]);
                    typeScopeSources.push(
                      getRequirementGroups(
                        ifaceTypeDirectives,
                        requiresScopesDirectiveName,
                        'scopes',
                      ),
                    );
                    typePolicySources.push(
                      getRequirementGroups(ifaceTypeDirectives, policyDirectiveName, 'policies'),
                    );
                    fieldInterfaceAuthArgs.push(ifaceFieldDirectives[authDirectiveName]?.[0]);
                    fieldScopeSources.push(
                      getRequirementGroups(
                        ifaceFieldDirectives,
                        requiresScopesDirectiveName,
                        'scopes',
                      ),
                    );
                    fieldPolicySources.push(
                      getRequirementGroups(ifaceFieldDirectives, policyDirectiveName, 'policies'),
                    );
                  }

                  const typeAuthArgsList = resolveAuthArgs(
                    ownTypeAuthArgs,
                    typeInterfaceAuthArgs,
                    authDirectiveIsPermissive,
                  );
                  const typeScopes = combineRequirementGroups(typeScopeSources);
                  const typePolicies = combineRequirementGroups(typePolicySources);
                  const fieldAuthArgsList = resolveAuthArgs(
                    ownFieldAuthArgs,
                    fieldInterfaceAuthArgs,
                    authDirectiveIsPermissive,
                  );
                  const fieldScopes = combineRequirementGroups(fieldScopeSources);
                  const fieldPolicies = combineRequirementGroups(fieldPolicySources);
                  const userScopes = extractScopes(user);
                  const userPolicies =
                    policiesByContext.get(args.contextValue as unknown as ContextType) ?? [];

                  // every restrictive declaration has to pass, so validate each distinct
                  // combination and stop on the first denial
                  let error: void | GraphQLError = undefined;
                  for (const typeAuthArgs of typeAuthArgsList) {
                    for (const fieldAuthArgs of fieldAuthArgsList) {
                      error ||= validateUser({
                        user,
                        fieldNode,
                        parentType,
                        typeScopes,
                        typePolicies,
                        typeAuthArgs,
                        typeDirectives,
                        executionArgs: args,
                        field,
                        fieldDirectives,
                        fieldAuthArgs,
                        fieldScopes,
                        fieldPolicies,
                        userScopes,
                        path: resolvePath,
                        userPolicies,
                      });
                    }
                  }
                  // partial denials should leave http status selection to
                  // the server, unless customized
                  if (error && !rejectUnauthenticated && !options.validateUser) {
                    delete error.extensions['http'];
                  }
                  return error;
                };

                const runtimeState: RuntimeAuthState = {
                  checks: new Set(),
                  denied: false,
                  fieldResolver: args.fieldResolver,
                  validate: handleField,
                };
                // fresh operation nodes per execution, so a reused parsed document never shares
                // the state. extended validation visits `args.document` only after creating the
                // rules, and copying the nodes later on (spreads, visitor edits) keeps the state
                args.document = {
                  ...args.document,
                  definitions: args.document.definitions.map(definition =>
                    definition.kind === Kind.OPERATION_DEFINITION
                      ? { ...definition, [runtimeStateSymbol]: runtimeState }
                      : definition,
                  ),
                };

                return {
                  FragmentSpread(node, _key, _parent, path, _ancestors) {
                    const fragmentName = node.name.value;
                    const fragment = context.getFragment(fragmentName);
                    if (fragment) {
                      const resolvePath = getResolvePath(
                        path,
                        schema.getType(fragment.typeCondition.name.value) as GraphQLObjectType,
                      );
                      fragmentPaths.set(fragmentName, resolvePath);
                    }
                  },
                  Field(node, _key, _parent, path) {
                    if (!shouldIncludeNode(variableValues as VariableValues, node)) {
                      return;
                    }

                    const fieldType = getNamedType(context.getParentType()!);
                    if (isIntrospectionType(fieldType)) {
                      return node;
                    }

                    const resolvePath = getResolvePath(
                      path,
                      getDefinedRootType(schema, operationType),
                    );

                    if (isUnionType(fieldType)) {
                      for (const objectType of fieldType.getTypes()) {
                        const error = handleField(node, objectType, resolvePath);
                        if (error) {
                          context.reportError(error);
                          return null;
                        }
                      }
                    } else if (isObjectType(fieldType) || isInterfaceType(fieldType)) {
                      const error = handleField(node, fieldType, resolvePath);
                      if (error) {
                        context.reportError(error);
                        return null;
                      }
                      if (isInterfaceType(fieldType)) {
                        // A field selected on an interface resolves on the object's actual type,
                        // which may carry its own (or its other interfaces') auth directives. That
                        // type is only known during execution, so object types that would deny the
                        // field are re-checked by the resolver wrapper against the actual object.
                        for (const objectType of schema.getPossibleTypes(fieldType)) {
                          if (handleField(node, objectType, resolvePath)) {
                            runtimeState.checks.add(`${objectType.name}.${node.name.value}`);
                          }
                        }
                      }
                    }
                    return undefined;
                  },
                };
              },
            ],
          }),
        );
      },
      onContextBuilding({ context, extendContext }) {
        return handleMaybePromise(
          () => options.resolveUserFn(context as unknown as ContextType),
          user => {
            // @ts-expect-error - Fix this
            if (context[contextFieldName] !== user) {
              // @ts-expect-error - Fix this
              extendContext({
                [contextFieldName]: user,
              });
            }
            if (options.extractPolicies) {
              return handleMaybePromise(
                () => user && options.extractPolicies?.(user, context as unknown as ContextType),
                policies => {
                  if (policies?.length) {
                    policiesByContext.set(context as unknown as ContextType, policies);
                  }
                },
              );
            }
          },
        );
      },
    };
  }
  if (options.mode === 'resolve-only') {
    return {
      onContextBuilding({ context, extendContext }) {
        return handleMaybePromise(
          () => options.resolveUserFn(context as unknown as ContextType),
          user => {
            extendContext({
              [contextFieldName]: user,
            } as any);
          },
        );
      },
    };
  }

  return {};
};
