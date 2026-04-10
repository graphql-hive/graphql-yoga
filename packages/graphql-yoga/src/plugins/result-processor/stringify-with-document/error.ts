import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { getSchemaCoordinate } from '@graphql-tools/utils';
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
  SCHEMA_COORDINATE_EXTENSION_FIELD_NAME,
} from './consts.js';
import { ObjectStringifyOptions, stringifyString, stringifyWithoutSelectionSet } from './data.js';
import { omitInternalsFromError } from '../stringify.js';

const extensionsObjectOptions: ObjectStringifyOptions = {
  ignoredFields: new Set(['http', 'unexpected']),
}

export function stringifyError(error: GraphQLError) {
  const serializedError: GraphQLFormattedError = omitInternalsFromError(error);
  let buf = '';
  buf += OPEN_BRACE;
  let first = true;
  if (serializedError.message) {
    first = false;
    buf += QUOTE + MESSAGE_FIELD_NAME + QUOTE + COLON + stringifyString(serializedError.message);
  }
  if (serializedError.path) {
    if (!first) {
      buf += COMMA;
    }
    buf += QUOTE + PATH_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < serializedError.path.length; i++) {
      const pathSegment = serializedError.path[i]!;
      if (i > 0) {
        buf += COMMA;
      }
      if (typeof pathSegment === 'string') {
        buf += QUOTE + pathSegment + QUOTE;
      } else {
        buf += pathSegment;
      }
    }
    buf += CLOSE_BRACKET;
  }
  if (serializedError.locations) {
    if (!first) {
      buf += COMMA;
    }
    buf += QUOTE + LOCATIONS_FIELD_NAME + QUOTE + COLON + OPEN_BRACKET;
    for (let i = 0; i < serializedError.locations.length; i++) {
      const location = serializedError.locations[i]!;
      if (i > 0) {
        buf += COMMA;
      }
      buf += OPEN_BRACE;
      buf += QUOTE + LINE_FIELD_NAME + QUOTE + COLON + location.line + COMMA;
      buf += QUOTE + COLUMN_FIELD_NAME + QUOTE + COLON + location.column;
      buf += CLOSE_BRACE;
    }
    buf += CLOSE_BRACKET;
  }
  if (serializedError.extensions) {
    if (!first) {
      buf += COMMA;
    }
    buf +=
      QUOTE +
      EXTENSIONS_FIELD_NAME +
      QUOTE +
      COLON +
    stringifyWithoutSelectionSet(serializedError.extensions, extensionsObjectOptions);
  }
  const coordinate = getSchemaCoordinate(error);
  if (coordinate) {
    if (!first) {
      buf += COMMA;
    }
    buf +=
      QUOTE + SCHEMA_COORDINATE_EXTENSION_FIELD_NAME + QUOTE + COLON + QUOTE + coordinate + QUOTE;
  }
  buf += CLOSE_BRACE;
  return buf;
}
