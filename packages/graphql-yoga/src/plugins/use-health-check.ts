import { Logger } from '@graphql-hive/logger';
import { getRequestLog } from '../logger.js';
import type { YogaConfigContext } from '../types.js';
import type { Plugin } from './types.js';

export interface HealthCheckPluginOptions {
  id?: string;
  log?: Logger;
  endpoint?: string;
}

export function useHealthCheck({
  id = Date.now().toString(),
  log = new Logger(),
  endpoint = '/health',
}: HealthCheckPluginOptions = {}): Plugin {
  return {
    onRequest({ endResponse, fetchAPI, request, serverContext }) {
      if (request.url.endsWith(endpoint)) {
        getRequestLog(serverContext as Partial<YogaConfigContext>, log).debug(
          'Responding Health Check',
        );
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
