import type {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  GraphQLSchema,
  parse,
  TypeInfo,
  validate,
  ValidationRule,
} from 'graphql';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import type { TypedExecutionArgs, TypedSubscriptionArgs } from './hooks.js';

export type ExecuteFunction = (
  args: TypedExecutionArgs<unknown>,
) => MaybePromise<AsyncIterable<ExecutionResult> | ExecutionResult>;

export type SubscribeFunction = (
  args: TypedSubscriptionArgs<unknown>,
) => MaybePromise<AsyncIterable<ExecutionResult> | ExecutionResult>;

export type ParseFunction = typeof parse;

export type ValidateFunction = typeof validate;

export type ValidateFunctionParameter = {
  /**
   * GraphQL schema instance.
   */
  schema: GraphQLSchema;
  /**
   * Parsed document node.
   */
  documentAST: DocumentNode;
  /**
   * The rules used for validation.
   * validate uses specifiedRules as exported by the GraphQL module if this parameter is undefined.
   */
  rules?: ValidationRule[];
  /**
   * TypeInfo instance which is used for getting schema information during validation
   */
  typeInfo?: TypeInfo;

  options?: Parameters<ValidateFunction>[3];
};

/** @private */
export type PolymorphicExecuteArguments =
  | [TypedExecutionArgs<unknown>]
  | [
      ExecutionArgs['schema'],
      ExecutionArgs['document'],
      ExecutionArgs['rootValue'],
      ExecutionArgs['contextValue'],
      ExecutionArgs['variableValues'],
      ExecutionArgs['operationName'],
      ExecutionArgs['fieldResolver'],
      ExecutionArgs['typeResolver'],
      ExecutionArgs['subscribeFieldResolver'],
    ];

/** @private */
export type PolymorphicSubscribeArguments = PolymorphicExecuteArguments;

export type Path = {
  readonly prev: Path | undefined;
  readonly key: string | number;
  readonly typename: string | undefined;
};

export interface IncrementalDeferResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends ExecutionResult<TData, TExtensions> {
  path?: ReadonlyArray<string | number>;
  label?: string;
}

export interface IncrementalStreamResult<
  TData = Array<unknown>,
  TExtensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  items?: TData | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: TExtensions;
}

export type IncrementalResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> = IncrementalDeferResult<TData, TExtensions> | IncrementalStreamResult<TData, TExtensions>;

export interface IncrementalExecutionResult<
  TData = Record<string, unknown>,
  TExtensions = Record<string, unknown>,
> extends ExecutionResult<TData, TExtensions> {
  hasNext: boolean;
  incremental?: ReadonlyArray<IncrementalResult<TData, TExtensions>>;
  extensions?: TExtensions;
}
