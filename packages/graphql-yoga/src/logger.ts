import type { LogLevel } from '@graphql-hive/logger';
import { Logger } from '@graphql-hive/logger';
import type { YogaConfigContext } from './types.js';

/**
 * Creates a {@link Logger} out of the `logging` option of the server.
 *
 * Kept in sync with Hive Gateway's `createLoggerFromLogging` so that both products
 * interpret the `logging` option in exactly the same way.
 */
export function createLoggerFromLogging(logging: boolean | Logger | LogLevel | undefined): Logger {
  if (logging == null || typeof logging === 'boolean') {
    return new Logger({ level: logging === false ? false : 'info' });
  }
  if (typeof logging === 'string') {
    return new Logger({ level: logging });
  }
  return logging;
}

/**
 * The request-scoped logger put in the server context by {@link useConfigInServerContext}
 * (and correlated to the request id by {@link useRequestId}), falling back to `fallback` when
 * there is none (e.g. when the server context is built by hand, like for WebSocket
 * subscriptions, or when a plugin is used without the rest of Yoga's server setup).
 */
export function getRequestLog(
  serverContext: Partial<YogaConfigContext> | undefined,
  fallback: Logger,
): Logger {
  return serverContext?.log ?? fallback;
}
