/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

export const ansiCodes = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

export const warnPrefix = ansiCodes.yellow + 'WARN' + ansiCodes.reset;
export const infoPrefix = ansiCodes.cyan + 'INFO' + ansiCodes.reset;
export const errorPrefix = ansiCodes.red + 'ERR' + ansiCodes.reset;
export const debugPrefix = ansiCodes.magenta + 'DEBUG' + ansiCodes.reset;
export const titleBold = (msg: string) => ansiCodes.bold + msg + ansiCodes.reset;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type YogaLogger = {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  createChild?: (prefix: string) => YogaLogger;
};

const logLevelScores: Record<LogLevel | 'silent', number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const noop = () => {};

const withPrefix =
  (prefix: string, name?: string) =>
  (...args: Array<any>) => {
    const namePrefix = name ? `[${titleBold(name)}] ` + ' ' : '';
    console.log(namePrefix + prefix, ...args);
  };

const createLogFunction = (prefix: string, name?: string) => withPrefix(prefix, name);

export const createLogger = (
  logLevel: LogLevel | 'silent' = globalThis.process?.env['DEBUG'] === '1' ? 'debug' : 'info',
  name?: string,
): YogaLogger => {
  const score = logLevelScores[logLevel];

  const logger: YogaLogger = {
    debug: score > logLevelScores.debug ? noop : createLogFunction(debugPrefix, name),
    info: score > logLevelScores.info ? noop : createLogFunction(infoPrefix, name),
    warn: score > logLevelScores.warn ? noop : createLogFunction(warnPrefix, name),
    error: score > logLevelScores.error ? noop : createLogFunction(errorPrefix, name),
    createChild: (childPrefix: string) =>
      createLogger(logLevel, String(name ? `${name}]-[${childPrefix}` : '')),
  };

  return logger;
};
