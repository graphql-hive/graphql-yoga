const MAX_REQUEST_ID_LENGTH = 128;
// eslint-disable-next-line no-control-regex
const INVALID_REQUEST_ID_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Resolves the request id to use for correlating log lines, preferring a client-supplied
 * `x-request-id` header. Rejects values that are empty, too long, or contain control
 * characters (e.g. newlines), falling back to a generated id instead - the header is
 * attacker-controlled and gets embedded verbatim into every log line for the request.
 */
export function getRequestId(
  headerValue: string | null | undefined,
  generateId: () => string,
): string {
  if (
    headerValue &&
    headerValue.length <= MAX_REQUEST_ID_LENGTH &&
    !INVALID_REQUEST_ID_CHARS.test(headerValue)
  ) {
    return headerValue;
  }
  return generateId();
}
