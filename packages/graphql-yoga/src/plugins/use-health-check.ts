import type { Plugin } from './types.js';

export interface HealthCheckPluginOptions {
  id?: string;
  endpoint?: string;
}

export function useHealthCheck({
  id = Date.now().toString(),
  endpoint = '/health',
}: HealthCheckPluginOptions = {}): Plugin {
  return {
    onRequest({ endResponse, fetchAPI, request, serverContext }) {
      if (request.url.endsWith(endpoint)) {
        serverContext.log.debug('Responding Health Check');
        const response = new fetchAPI.Response(null, {
          status: 200,
          headers: {
            'x-yoga-id': id,
          },
        });
        endResponse(response);
      }
    },
  };
}
