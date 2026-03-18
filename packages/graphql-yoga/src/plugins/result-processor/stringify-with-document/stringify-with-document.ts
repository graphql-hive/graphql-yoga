import {
  DocumentNode,
  getOperationAST,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql';
import { getFragmentsFromDocument, getVariableValues } from '@graphql-tools/executor';
import { ExecutionResult } from '@graphql-tools/utils';
import { ExecutionArgsForResult } from '../../use-result-processor.js';
import {
  CLOSE_BRACE,
  CLOSE_BRACKET,
  COLON,
  COMMA,
  DATA_FIELD_NAME,
  ERRORS_FIELD_NAME,
  EXTENSIONS_FIELD_NAME,
  HAS_NEXT_FIELD_NAME,
  OPEN_BRACE,
  OPEN_BRACKET,
  QUOTE,
} from './consts.js';
import {
  stringifyResultToString,
  stringifyWithoutSelectionSet,
  stringifyWithSelectionSet,
} from './data.js';
import { stringifyError } from './error.js';

export interface StringifyContext {
  schema: GraphQLSchema;
  document: DocumentNode;
  operationAst: OperationDefinitionNode;
  operationType: OperationTypeNode;
  operationName?: string;
  fragments: Record<string, any>;
  variables?: Record<string, any>;
}

const EMPTY_OBJECT = {};

export function stringifyWithDocument(
  result: ExecutionResult,
  executionArgs: ExecutionArgsForResult,
): string {
  const operationAst = getOperationAST(executionArgs.document, executionArgs.operationName);
  if (!operationAst) {
    throw new Error(
      `Could not find operation with name "${executionArgs.operationName}" in the provided document.`,
    );
  }
  let variables: Record<string, any> | undefined;
  if (operationAst.variableDefinitions) {
    variables = getVariableValues(
      executionArgs.schema,
      operationAst.variableDefinitions,
      EMPTY_OBJECT,
    ).coerced;
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
  let first = true;
  let buf = OPEN_BRACE;
  if (result.data !== undefined) {
    first = false;
    const rootType = executionArgs.schema.getRootType(
      stringifyContext.operationType,
    ) ?? undefined;
    buf +=
      QUOTE +
      DATA_FIELD_NAME +
      QUOTE +
      COLON +
      stringifyResultToString(
        stringifyWithSelectionSet(
          result.data,
          operationAst.selectionSet,
          stringifyContext,
          rootType,
        ),
      );
  }
  if (result.errors) {
    if (!first) {
      buf += COMMA;
    }
    buf += QUOTE + ERRORS_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < result.errors.length; i++) {
      const error = result.errors[i]!;
      if (i > 0) {
        buf += COMMA;
      }
      buf += stringifyError(error);
    }
    buf += CLOSE_BRACKET;
  }
  if (result.extensions) {
    if (!first) {
      buf += COMMA;
    }
    buf +=
      QUOTE +
      EXTENSIONS_FIELD_NAME +
      QUOTE +
      COLON +
      stringifyWithoutSelectionSet(result.extensions);
  }
  if (result.hasNext != null) {
    if (!first) {
      buf += COMMA;
    }
    buf +=
      QUOTE + HAS_NEXT_FIELD_NAME + QUOTE + COLON + stringifyWithoutSelectionSet(result.hasNext);
  }
  buf += CLOSE_BRACE;
  return buf;
}
