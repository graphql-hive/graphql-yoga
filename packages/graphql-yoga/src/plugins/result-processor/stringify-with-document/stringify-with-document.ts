import { DocumentNode, GraphQLSchema } from 'graphql';
import { getVariableValues } from '@graphql-tools/executor';
import { ExecutionResult } from '@graphql-tools/utils';
import { ExecutionArgsForResult } from '../../use-result-processor.js';
import {
  CLOSE_BRACKET,
  COLON,
  COMMA,
  DATA_FIELD_NAME,
  ERRORS_FIELD_NAME,
  EXTENSIONS_FIELD_NAME,
  OPEN_BRACKET,
  QUOTE,
} from './consts.js';
import { projectWithPlan, stringifyWithoutSelectionSet } from './data.js';
import { stringifyError } from './error.js';
import { getOrCompileProjectionPlan } from './projection-plan.js';

// Re-exported for any downstream consumers that imported this type directly.
export interface StringifyContext {
  schema: GraphQLSchema;
  document: DocumentNode;
  operationName?: string;
  variables?: Record<string, unknown>;
}

export function stringifyWithDocument(
  result: ExecutionResult,
  executionArgs: ExecutionArgsForResult,
): string {
  // Retrieve (or build and cache) the pre-compiled projection plan.
  const plan = getOrCompileProjectionPlan(
    executionArgs.schema,
    executionArgs.document,
    executionArgs.operationName,
  );
  if (!plan) {
    // Could not find the operation in the document – fall back to JSON.stringify.
    return JSON.stringify(result);
  }

  // Coerce variables once per request (needed for @skip / @include evaluation).
  let variables: Record<string, unknown> | undefined;
  if (plan.variableDefinitions.length > 0) {
    const coerceResult = getVariableValues(
      executionArgs.schema,
      plan.variableDefinitions,
      (executionArgs.variableValues as Record<string, unknown>) ?? {},
    );
    if (coerceResult.errors) {
      // Variable coercion failed – fall back to JSON.stringify.
      return JSON.stringify(result);
    }
    variables = coerceResult.coerced as Record<string, unknown>;
  }

  let buf = '{';
  let first = true;

  if (result.data !== undefined) {
    first = false;
    buf +=
      QUOTE +
      DATA_FIELD_NAME +
      QUOTE +
      COLON +
      projectWithPlan(result.data, plan.fields, variables);
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

  buf += '}';
  return buf;
}
