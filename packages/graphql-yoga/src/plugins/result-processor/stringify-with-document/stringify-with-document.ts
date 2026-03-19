import { DocumentNode, GraphQLSchema } from 'graphql';
import { getVariableValues } from '@graphql-tools/executor';
import { ExecutionResult } from '@graphql-tools/utils';
import { ExecutionArgsForResult } from '../../use-result-processor.js';
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

// Pre-computed JSON key fragments for the top-level response object.
// Avoids repeated string concatenation on every serialized response.
const DATA_KEY = '"data":';
const ERRORS_KEY_OPEN = '"errors":[';
const COMMA_ERRORS_KEY_OPEN = ',"errors":[';
const EXTENSIONS_KEY = '"extensions":';
const COMMA_EXTENSIONS_KEY = ',"extensions":';

// Shared empty object for the common case where variableValues is not provided.
const EMPTY_VARIABLE_VALUES: Record<string, unknown> = {};

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
      (executionArgs.variableValues as Record<string, unknown>) ?? EMPTY_VARIABLE_VALUES,
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
    buf += DATA_KEY + projectWithPlan(result.data, plan.fields, variables);
  }

  if (result.errors?.length) {
    buf += first ? ERRORS_KEY_OPEN : COMMA_ERRORS_KEY_OPEN;
    first = false;
    for (let i = 0; i < result.errors.length; i++) {
      if (i > 0) buf += ',';
      buf += stringifyError(result.errors[i]!);
    }
    buf += ']';
  }

  if (result.extensions != null) {
    buf += first ? EXTENSIONS_KEY : COMMA_EXTENSIONS_KEY;
    // first = false; (unused after this point)
    buf += stringifyWithoutSelectionSet(result.extensions);
  }

  buf += '}';
  return buf;
}
