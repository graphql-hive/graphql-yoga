import { ObjMap } from './utils.js';

export interface ExecutionArgs {
  schema: any;
  document: any;
  rootValue?: any;
  contextValue?: any;
  variableValues?: any;
  operationName?: any;
  fieldResolver?: any;
  typeResolver?: any;
  subscribeFieldResolver?: any;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function parse(source: any, options?: any): any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function execute(args: ExecutionArgs): any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function subscribe(args: ExecutionArgs): any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function validate(
  schema: any,
  documentAST: any,
  rules?: any,
  options?: any,
  typeInfo?: any,
): any;

export type ExecuteFunction = typeof execute;

export type SubscribeFunction = typeof subscribe;

export type ParseFunction = typeof parse;

export type ValidateFunction = typeof validate;

export type ValidateFunctionParameter = {
  /**
   * GraphQL schema instance.
   */
  schema: Parameters<ValidateFunction>[0];
  /**
   * Parsed document node.
   */
  documentAST: Parameters<ValidateFunction>[1];
  /**
   * The rules used for validation.
   * validate uses specifiedRules as exported by the GraphQL module if this parameter is undefined.
   */
  rules?: Parameters<ValidateFunction>[2];
  /**
   * TypeInfo instance which is used for getting schema information during validation
   */
  typeInfo?: Parameters<ValidateFunction>[3];
  options?: Parameters<ValidateFunction>[4];
};

/** @private */
export type PolymorphicExecuteArguments =
  | [ExecutionArgs]
  | [
      ExecutionArgs['schema'],
      ExecutionArgs['document'],
      ExecutionArgs['rootValue'],
      ExecutionArgs['contextValue'],
      ExecutionArgs['variableValues'],
      ExecutionArgs['operationName'],
      ExecutionArgs['fieldResolver'],
      ExecutionArgs['typeResolver'],
    ];

/** @private */
export type PolymorphicSubscribeArguments = PolymorphicExecuteArguments;

export type Path = {
  readonly prev: Path | undefined;
  readonly key: string | number;
  readonly typename: string | undefined;
};

export interface ExecutionResult<TData = ObjMap<unknown>, TExtensions = ObjMap<unknown>> {
  errors?: ReadonlyArray<any>;
  data?: TData | null;
  extensions?: TExtensions;
}

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
  errors?: ReadonlyArray<any>;
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
