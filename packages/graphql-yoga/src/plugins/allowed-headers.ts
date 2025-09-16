import { Plugin } from './types.js';

export function useAllowedResponseHeaders(allowedHeaders: string[]): Plugin {
  return {
    onResponse({ response }) {
      removeDisallowedHeaders(response.headers, allowedHeaders);
    },
  };
}

export function useAllowedRequestHeaders(allowedHeaders: string[]): Plugin {
  return {
    onRequest({ request }) {
      removeDisallowedHeaders(request.headers, allowedHeaders);
    },
  };
}

function removeDisallowedHeaders(headers: Headers, allowedHeaders: string[]) {
  for (const headerName of headers.keys()) {
    if (!allowedHeaders.includes(headerName)) {
      headers.delete(headerName);
    }
  }
}
