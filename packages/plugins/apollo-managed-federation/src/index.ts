import { GraphQLError } from 'graphql';
import type { Plugin } from 'graphql-yoga';
import {
  FetchError,
  SupergraphSchemaManager,
  SupergraphSchemaManagerOptions,
} from '@graphql-tools/federation';

export type ManagedFederationPluginOptions = (
  | (SupergraphSchemaManagerOptions & { supergraphManager?: never })
  | { supergraphManager: SupergraphSchemaManager }
) & {
  /**
   * The manager to be used for fetching the schema and keeping it up to date
   * If not provided, on will be instantiated with the provided options
   */
  supergraphManager?: SupergraphSchemaManager | never;
  /**
   * The logger to be used by this plugin
   * Defaults to the `console` object
   */
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
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
  const {
    logger = console,
    supergraphManager = new SupergraphSchemaManager(options as SupergraphSchemaManagerOptions),
  } = options;

  supergraphManager.on('log', ({ level, message, source }) => {
    logger[level](`[ManagedFederation]${source === 'uplink' ? ' <UPLINK>' : ''} ${message}`);
  });

  supergraphManager.on(
    'failure',
    options.onFailure ??
      ((error, delayInSeconds) => {
        const message = (error as { message: string })?.message ?? error;
        logger.error(
          `[ManagedFederation] Failed to load supergraph schema.${
            message ? ` Last error: ${message}` : ''
          }`,
        );
        logger.info(
          `[ManagedFederation] No failure handler provided. Retrying in ${delayInSeconds}s.`,
        );
        supergraphManager.start(delayInSeconds);
      }),
  );

  // Start as soon as possible to minimize the wait time of the first schema loading
  supergraphManager.start();

  const plugin: Plugin = {
    onPluginInit({ setSchema }) {
      if (supergraphManager.schema) {
        setSchema(supergraphManager.schema);
      } else {
        // Wait for the first schema to be loaded before before allowing requests to be parsed
        // We can then remove the onRequestParse hook to avoid async cost on every request
        const waitForInitialization = new Promise<void>((resolve, reject) => {
          const onFailure = (err: unknown) => {
            reject(
              new GraphQLError('Supergraph failed to load', {
                originalError: err instanceof Error ? err : null,
              }),
            );
          };
          supergraphManager.once('failure', onFailure);
          supergraphManager.once('schema', schema => {
            setSchema(schema);
            supergraphManager.off('failure', onFailure);
            resolve();
            plugin.onRequestParse = undefined;
          });
        });
        plugin.onRequestParse = async () => {
          await waitForInitialization;
        };
      }
      supergraphManager.on('schema', setSchema);
    },
  };

  return plugin;
}
