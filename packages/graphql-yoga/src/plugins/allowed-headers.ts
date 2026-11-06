import type { Plugin } from './types.js';

export function useAllowedResponseHeaders(allowedHeaders: string[]): Plugin {
  const allowedHeaderNames = toLowerCaseSet(allowedHeaders);
  return {
    onResponse({ response }) {
      removeDisallowedHeaders(response.headers, allowedHeaderNames);
    },
  };
}

export function useAllowedRequestHeaders(allowedHeaders: string[]): Plugin {
  const allowedHeaderNames = toLowerCaseSet(allowedHeaders);
  return {
    onRequest({ request }) {
      removeDisallowedHeaders(request.headers, allowedHeaderNames);
    },
  };
}

function toLowerCaseSet(allowedHeaders: string[]): Set<string> {
  return new Set(allowedHeaders.map(name => name.toLowerCase()));
}

function removeDisallowedHeaders(headers: Headers, allowedHeaderNames: Set<string>) {
  // Header names are case-insensitive (e.g. built-in result processors send `Content-Type`),
  // so the allow-list must be compared case-insensitively too, or else legitimately allowed
  // headers get stripped whenever their casing doesn't match the list verbatim.
  for (const headerName of headers.keys()) {
    if (!allowedHeaderNames.has(headerName.toLowerCase())) {
      headers.delete(headerName);
    }
  }
}
