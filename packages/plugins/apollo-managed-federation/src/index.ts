import { createGraphQLError, type Plugin } from 'graphql-yoga';
import {
  FetchError,
  SupergraphSchemaManager,
  type SupergraphSchemaManagerFailureEvent,
  type SupergraphSchemaManagerLogEvent,
  type SupergraphSchemaManagerOptions,
  type SupergraphSchemaManagerSchemaEvent,
} from '@graphql-tools/federation';

export type ManagedFederationPluginOptions = (
  | SupergraphSchemaManager
  | SupergraphSchemaManagerOptions
) & {
  /**
   * Allow to customize how a schema loading failure is handled.
   * A failure happens when the manager failed to load the schema more than the provided max retries
   * count.
   * By default, an error is logged and the polling is restarted.
   * @param error The error encountered during the last fetch tentative
   * @param delayInSeconds The delay in seconds indicated by GraphOS before a new try
   */
  onFailure?: (error: FetchError | unknown, delayInSeconds: number) => void;
};

export function useManagedFederation(options: ManagedFederationPluginOptions = {}): Plugin {
  let _supergraphManager: SupergraphSchemaManager;

  function ensureSupergraphManager() {
    if (_supergraphManager == null) {
      if (options instanceof SupergraphSchemaManager) {
        _supergraphManager = options;
      } else {
        _supergraphManager = new SupergraphSchemaManager(options);
      }
    }
    return _supergraphManager;
  }

  const plugin: Plugin = {
    onYogaInit({ yoga }) {
      ensureSupergraphManager().addEventListener(
        'log',
        ({ detail: { level, message, source } }: SupergraphSchemaManagerLogEvent) => {
          yoga.logger[level](
            `[ManagedFederation]${source === 'uplink' ? ' <UPLINK>' : ''} ${message}`,
          );
        },
      );

      ensureSupergraphManager().addEventListener(
        'failure',
        ({ detail: { error, delayInSeconds } }: SupergraphSchemaManagerFailureEvent) => {
          if (options.onFailure) {
            return options.onFailure(error, delayInSeconds);
          }
          const message = (error as { message: string })?.message ?? error;
          yoga.logger.error(
            `[ManagedFederation] Failed to load supergraph schema.${
              message ? ` Last error: ${message}` : ''
            }`,
          );
          yoga.logger.info(
            `[ManagedFederation] No failure handler provided. Retrying in ${delayInSeconds}s.`,
          );
          ensureSupergraphManager().start(delayInSeconds);
        },
      );

      ensureSupergraphManager().start();
    },
    onPluginInit({ setSchema }) {
      if (ensureSupergraphManager().schema) {
        setSchema(ensureSupergraphManager().schema);
      } else {
        // Wait for the first schema to be loaded before before allowing requests to be parsed
        // We can then remove the onRequestParse hook to avoid async cost on every request
        let waitForInitialization: Promise<void> | undefined = new Promise<void>(
          (resolve, reject) => {
            const onFailure = (evt: SupergraphSchemaManagerFailureEvent) => {
              reject(
                createGraphQLError('Supergraph failed to load', {
                  originalError: evt.detail.error instanceof Error ? evt.detail.error : undefined,
                }),
              );
            };
            ensureSupergraphManager().addEventListener('failure', onFailure, { once: true });
            ensureSupergraphManager().addEventListener(
              'schema',
              (evt: SupergraphSchemaManagerSchemaEvent) => {
                setSchema(evt.detail.schema);
                ensureSupergraphManager().removeEventListener('failure', onFailure);
                resolve();
                plugin.onRequestParse = undefined;
                waitForInitialization = undefined;
              },
              { once: true },
            );
          },
        );
        plugin.onRequestParse = () => waitForInitialization;
      }
      ensureSupergraphManager().addEventListener(
        'schema',
        (evt: SupergraphSchemaManagerSchemaEvent) => {
          setSchema(evt.detail.schema);
        },
      );
    },
    onDispose() {
      return _supergraphManager?.stop();
    },
  };

  return plugin;
}
