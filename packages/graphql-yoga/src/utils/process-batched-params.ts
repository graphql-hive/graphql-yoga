import { GraphQLParams } from '../types.js';

export function processBatchedParams(
  params: GraphQLParams | GraphQLParams[],
): GraphQLParams | GraphQLParams[] {
  if (Array.isArray(params)) {
    return params.flatMap(param => processBatchedParams(param));
  }
  if (Array.isArray(params.variables)) {
    return params.variables.map(variables => ({
      ...params,
      variables,
    }));
  }
  return params;
}
