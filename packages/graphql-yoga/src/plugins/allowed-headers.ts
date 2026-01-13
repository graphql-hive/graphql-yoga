import { Plugin } from '@graphql-yoga/types';

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
  for (const headerName of [...headers.keys()]) {
    console.log('checking', headerName);
    if (!allowedHeaders.includes(headerName)) {
      headers.delete(headerName);
    }
  }
}
