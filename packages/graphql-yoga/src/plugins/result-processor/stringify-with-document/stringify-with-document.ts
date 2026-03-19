import {
  DocumentNode,
  FragmentDefinitionNode,
  getOperationAST,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql';
import { getFragmentsFromDocument, getVariableValues } from '@graphql-tools/executor';
import { ExecutionResult } from '@graphql-tools/utils';
import { ExecutionArgsForResult } from '../../use-result-processor.js';
import {
  CLOSE_BRACKET,
  COLON,
  COMMA,
  DATA_FIELD_NAME,
  ERRORS_FIELD_NAME,
  EXTENSIONS_FIELD_NAME,
  HAS_NEXT_FIELD_NAME,
  OPEN_BRACKET,
  QUOTE,
} from './consts.js';
import { resultToString, stringifyWithoutSelectionSet, stringifyWithSelectionSet } from './data.js';
import { stringifyError } from './error.js';

export interface StringifyContext {
  schema: GraphQLSchema;
  document: DocumentNode;
  operationAst: OperationDefinitionNode;
  operationType: OperationTypeNode;
  operationName?: string;
  fragments: Record<string, FragmentDefinitionNode>;
  variables?: Record<string, unknown>;
}

export function stringifyWithDocument(
  result: ExecutionResult,
  executionArgs: ExecutionArgsForResult,
): string {
  const operationAst = getOperationAST(executionArgs.document, executionArgs.operationName ?? null);
  if (!operationAst) {
    // Can't find operation, fall back to JSON.stringify
    return JSON.stringify(result);
  }

  let variables: Record<string, unknown> | undefined;
  if (operationAst.variableDefinitions?.length) {
    const coerceResult = getVariableValues(
      executionArgs.schema,
      operationAst.variableDefinitions,
      (executionArgs.variableValues as Record<string, unknown>) ?? {},
    );
    if (coerceResult.errors) {
      // Variable coercion failed; fall back to JSON.stringify
      return JSON.stringify(result);
    }
    variables = coerceResult.coerced as Record<string, unknown>;
  }

  const stringifyContext: StringifyContext = {
    schema: executionArgs.schema,
    document: executionArgs.document,
    operationAst,
    operationType: operationAst.operation,
    operationName: executionArgs.operationName,
    fragments: getFragmentsFromDocument(executionArgs.document),
    variables,
  };

  let buf = '{';
  let first = true;

  if (result.data !== undefined) {
    first = false;
    const rootType = executionArgs.schema.getRootType(stringifyContext.operationType) ?? undefined;
    buf +=
      QUOTE +
      DATA_FIELD_NAME +
      QUOTE +
      COLON +
      resultToString(
        stringifyWithSelectionSet(
          result.data,
          operationAst.selectionSet,
          stringifyContext,
          rootType,
        ),
      );
  }

  if (result.errors?.length) {
    if (!first) buf += COMMA;
    first = false;
    buf += QUOTE + ERRORS_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < result.errors.length; i++) {
      if (i > 0) buf += COMMA;
      buf += stringifyError(result.errors[i]!);
    }
    buf += CLOSE_BRACKET;
  }

  if (result.extensions != null) {
    if (!first) buf += COMMA;
    first = false;
    buf +=
      QUOTE +
      EXTENSIONS_FIELD_NAME +
      QUOTE +
      COLON +
      stringifyWithoutSelectionSet(result.extensions);
  }

  if (result.hasNext != null) {
    if (!first) buf += COMMA;
    first = false;
    buf += QUOTE + HAS_NEXT_FIELD_NAME + QUOTE + COLON + (result.hasNext ? 'true' : 'false');
  }

  buf += '}';
  return buf;
}
