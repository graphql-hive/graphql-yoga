export function isResponse(value: unknown): value is Response {
  // @ts-expect-error - we want to check if it is a Response
  return value?.status && value?.headers;
}
