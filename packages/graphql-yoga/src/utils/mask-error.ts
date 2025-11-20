import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { createGraphQLError, getSchemaCoordinate } from '@graphql-tools/utils';
import { isGraphQLError, isOriginalGraphQLError } from '../error.js';
import { MaskError } from '../types.js';

// We override the `toJSON` function to mask coordinate, because otherwise, it will be entirely
// masked for plugins after the onExecuteDone phase (which have an impact for telemetry for example)
function toJsonWithoutCoordinate(this: GraphQLError): GraphQLFormattedError {
  const toJSON: typeof GraphQLError.prototype.toJSON =
    (this as { _originalToJSON?: typeof GraphQLError.prototype.toJSON })._originalToJSON ??
    GraphQLError.prototype.toJSON;
  const json = toJSON.apply(this);
  // @ts-expect-error coordinate is readonly
  delete json.coordinate;

  return json;
}

function serializeError(error: unknown) {
  if (isGraphQLError(error)) {
    return error.toJSON();
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
  return error;
}

export const maskError: MaskError = (
  error: unknown,
  message: string,
  isDev = globalThis.process?.env?.['NODE_ENV'] === 'development',
) => {
  if (isOriginalGraphQLError(error)) {
    if (!isDev) {
      Object.defineProperties(error, {
        toJSON: { value: toJsonWithoutCoordinate },
        _originalToJSON: { value: error.toJSON },
      });
    }
    return error;
  }
  const errorExtensions: Record<string, unknown> = {
    code: 'INTERNAL_SERVER_ERROR',
    unexpected: true,
  };
  const errorOptions: Parameters<typeof createGraphQLError>[1] = {
    extensions: errorExtensions,
  };
  if (isGraphQLError(error)) {
    errorOptions.nodes = error.nodes;
    errorOptions.source = error.source;
    errorOptions.positions = error.positions;
    errorOptions.path = error.path;
    errorOptions.coordinate = getSchemaCoordinate(error);
    if (isDev && error.originalError) {
      errorExtensions['originalError'] = serializeError(error.originalError);
    }
    if (error.extensions?.['http']) {
      errorExtensions['http'] = error.extensions['http'];
    }
  } else if (isDev) {
    errorExtensions['originalError'] = serializeError(error);
  }

  const maskedError = createGraphQLError(message, errorOptions);

  if (!isDev) {
    Object.defineProperties(maskedError, {
      toJSON: { value: toJsonWithoutCoordinate },
      _originalToJSON: { value: maskedError.toJSON },
    });
    if (maskedError.extensions['originalError'] instanceof GraphQLError) {
      Object.defineProperties(maskedError.extensions['originalError'], {
        toJSON: { value: toJsonWithoutCoordinate },
        _originalToJSON: { value: maskedError.extensions['originalError'].toJSON },
      });
    }
  }

  return maskedError;
};
