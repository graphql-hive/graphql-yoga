import type { GraphQLError } from 'graphql';
import { getArgumentValues, versionInfo } from 'graphql';
import type { VariableValues } from '@graphql-tools/utils';

type FlatVariableMap = {
  readonly [variable: string]: unknown;
};

function emptySources(): VariableValues['sources'] {
  return Object.create(null) as VariableValues['sources'];
}

/** GraphQL 17 `getArgumentValues` expects `{ coerced, sources }`; GraphQL 16 accepts a flat map. */
export function asGetArgumentValuesVariables(
  variableValues: FlatVariableMap | null | undefined,
): Parameters<typeof getArgumentValues>[2] {
  if (variableValues == null) {
    return undefined;
  }
  if (versionInfo.major >= 17 && !('coerced' in variableValues)) {
    return {
      coerced: variableValues,
      sources: emptySources(),
    } as unknown as Parameters<typeof getArgumentValues>[2];
  }
  return variableValues as unknown as Parameters<typeof getArgumentValues>[2];
}

/**
 * Normalize `getVariableValues` success/error shapes across GraphQL 16 (`{ coerced }`) and
 * GraphQL 17 (`{ variableValues: { coerced, sources } }`) for utils helpers like `shouldIncludeNode`.
 */
export function coerceGetVariableValuesResult(result: {
  errors?: ReadonlyArray<GraphQLError>;
  variableValues?: VariableValues;
  coerced?: FlatVariableMap;
}): { readonly errors: ReadonlyArray<GraphQLError> } | { readonly variableValues: VariableValues } {
  if (result.errors != null && result.errors.length > 0) {
    return { errors: result.errors };
  }
  if (result.variableValues != null) {
    return { variableValues: result.variableValues };
  }
  if (result.coerced != null) {
    return {
      variableValues: {
        coerced: result.coerced,
        sources: emptySources(),
      },
    };
  }
  return {
    variableValues: {
      coerced: Object.create(null) as FlatVariableMap,
      sources: emptySources(),
    },
  };
}
