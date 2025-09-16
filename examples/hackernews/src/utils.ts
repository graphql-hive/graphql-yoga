import { GraphQLError } from 'graphql';

export const parseIntSafe = (value: string): number | null => {
  if (/^(\d+)$/.test(value)) {
    return parseInt(value, 10);
  }
  return null;
};

export const applySkipConstraints = (value: number) => {
  if (value < 0) {
    throw new GraphQLError(`'skip' argument value '${value}' is invalid, value must be positive.`);
  }
  return value;
};

export const applyTakeConstraints = (params: { min: number; max: number; value: number }) => {
  if (params.value < params.min || params.value > params.max) {
    throw new GraphQLError(
      `'take' argument value '${params.value}' is outside the valid range of '${params.min}' to '${params.max}'.`,
    );
  }
  return params.value;
};
