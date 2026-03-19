import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { getSchemaCoordinate } from '@graphql-tools/utils';
import { omitInternalsFromError } from '../stringify.js';
import {
  CLOSE_BRACE,
  CLOSE_BRACKET,
  COLON,
  COLUMN_FIELD_NAME,
  COMMA,
  EXTENSIONS_FIELD_NAME,
  LINE_FIELD_NAME,
  LOCATIONS_FIELD_NAME,
  MESSAGE_FIELD_NAME,
  OPEN_BRACE,
  OPEN_BRACKET,
  PATH_FIELD_NAME,
  QUOTE,
} from './consts.js';
import { ObjectStringifyOptions, stringifyString, stringifyWithoutSelectionSet } from './data.js';

const extensionsObjectOptions: ObjectStringifyOptions = {
  ignoredFields: new Set(['http', 'unexpected']),
};

export function stringifyError(error: GraphQLError): string {
  const serializedError: GraphQLFormattedError = omitInternalsFromError(
    error,
  ) as GraphQLFormattedError;
  let buf = OPEN_BRACE;
  let first = true;

  if (serializedError.message != null) {
    first = false;
    buf += QUOTE + MESSAGE_FIELD_NAME + QUOTE + COLON + stringifyString(serializedError.message);
  }

  if (serializedError.locations) {
    if (!first) buf += COMMA;
    first = false;
    buf += QUOTE + LOCATIONS_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < serializedError.locations.length; i++) {
      const location = serializedError.locations[i]!;
      if (i > 0) buf += COMMA;
      buf += OPEN_BRACE;
      buf += QUOTE + LINE_FIELD_NAME + QUOTE + COLON + location.line + COMMA;
      buf += QUOTE + COLUMN_FIELD_NAME + QUOTE + COLON + location.column;
      buf += CLOSE_BRACE;
    }
    buf += CLOSE_BRACKET;
  }

  if (serializedError.path) {
    if (!first) buf += COMMA;
    first = false;
    buf += QUOTE + PATH_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < serializedError.path.length; i++) {
      const segment = serializedError.path[i]!;
      if (i > 0) buf += COMMA;
      buf += typeof segment === 'string' ? stringifyString(segment) : String(segment);
    }
    buf += CLOSE_BRACKET;
  }

  if (serializedError.extensions) {
    if (!first) buf += COMMA;
    first = false;
    buf +=
      QUOTE +
      EXTENSIONS_FIELD_NAME +
      QUOTE +
      COLON +
      stringifyWithoutSelectionSet(serializedError.extensions, extensionsObjectOptions);
  }

  const coordinate = getSchemaCoordinate(error);
  if (coordinate) {
    if (!first) buf += COMMA;
    buf += QUOTE + 'schemaCoordinate' + QUOTE + COLON + QUOTE + coordinate + QUOTE;
  }

  buf += CLOSE_BRACE;
  return buf;
}
