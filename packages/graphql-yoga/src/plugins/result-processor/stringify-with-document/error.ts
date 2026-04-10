import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { getSchemaCoordinate } from '@graphql-tools/utils';
import { omitInternalsFromError } from '../stringify.js';
import { CLOSE_BRACE, OPEN_BRACE } from './consts.js';
import { ObjectStringifyOptions, stringifyString, stringifyWithoutSelectionSet } from './data.js';

const extensionsObjectOptions: ObjectStringifyOptions = {
  ignoredFields: new Set(['http', 'unexpected']),
};

// Pre-computed JSON key fragments for error objects.
// Avoids repeated string concatenation on every serialized error.
const MESSAGE_KEY = '"message":';
const LOCATIONS_KEY_OPEN = '"locations":[';
const COMMA_LOCATIONS_KEY_OPEN = ',"locations":[';
const PATH_KEY = '"path":[';
const COMMA_PATH_KEY = ',"path":[';
const EXTENSIONS_KEY = '"extensions":';
const COMMA_EXTENSIONS_KEY = ',"extensions":';
const LINE_KEY = '"line":';
const COMMA_COLUMN_KEY = ',"column":';
const SCHEMA_COORDINATE_KEY = '"schemaCoordinate":"';
const COMMA_SCHEMA_COORDINATE_KEY = ',"schemaCoordinate":"';

export function stringifyError(error: GraphQLError): string {
  const serializedError: GraphQLFormattedError = omitInternalsFromError(
    error,
  ) as GraphQLFormattedError;
  let buf = OPEN_BRACE;
  let first = true;

  if (serializedError.message != null) {
    first = false;
    buf += MESSAGE_KEY + stringifyString(serializedError.message);
  }

  if (serializedError.locations) {
    buf += first ? LOCATIONS_KEY_OPEN : COMMA_LOCATIONS_KEY_OPEN;
    first = false;
    for (let i = 0; i < serializedError.locations.length; i++) {
      const location = serializedError.locations[i]!;
      if (i > 0) buf += ',';
      buf += OPEN_BRACE;
      buf += LINE_KEY + location.line + COMMA_COLUMN_KEY + location.column;
      buf += CLOSE_BRACE;
    }
    buf += ']';
  }

  if (serializedError.path) {
    buf += first ? PATH_KEY : COMMA_PATH_KEY;
    first = false;
    for (let i = 0; i < serializedError.path.length; i++) {
      const segment = serializedError.path[i]!;
      if (i > 0) buf += ',';
      buf += typeof segment === 'string' ? stringifyString(segment) : String(segment);
    }
    buf += ']';
  }

  if (serializedError.extensions) {
    buf += first ? EXTENSIONS_KEY : COMMA_EXTENSIONS_KEY;
    first = false;
    buf += stringifyWithoutSelectionSet(serializedError.extensions, extensionsObjectOptions);
  }

  const coordinate = getSchemaCoordinate(error);
  if (coordinate) {
    buf += (first ? SCHEMA_COORDINATE_KEY : COMMA_SCHEMA_COORDINATE_KEY) + coordinate + '"';
  }

  buf += CLOSE_BRACE;
  return buf;
}
