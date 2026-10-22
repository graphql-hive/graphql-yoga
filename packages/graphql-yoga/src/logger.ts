import type { LogLevel } from '@graphql-hive/logger';
import { Logger } from '@graphql-hive/logger';

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
