import type { ServerAdapterPlugin } from '@whatwg-node/server';
import type { YogaConfigContext } from '../types.js';
import type { Plugin } from './types.js';

export interface ConfigInServerContextOptions {
  configContext: YogaConfigContext;
}

/**
 * Injects the {@link YogaConfigContext} (most notably the `log`ger) into the server context,
 * making it available to every plugin, hook and resolver handling the request.
 */
export function useConfigInServerContext({ configContext }: ConfigInServerContextOptions): Plugin {
  const keys = Object.keys(configContext) as (keyof YogaConfigContext)[];
  const configInServerContextPlugin: ServerAdapterPlugin = {
    onRequest({ serverContext }) {
      // we want to inject the YogaConfigContext to the server context to
      // have it available always through the plugin system
      for (const key of keys) {
        // `defineProperty` instead of a plain assignment because some integrations (e.g. Egg)
        // pass their own request context object through as the server context, and it may have
        // a getter-only accessor of the same name on its prototype which an assignment throws on
        Object.defineProperty(serverContext, key, {
          value: configContext[key],
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    },
  };
  return {
    onPluginInit({ plugins }) {
      if (!plugins.includes(configInServerContextPlugin)) {
        // we unshift because we want this plugin to run first before all other
        // this is because some routes, like graphiql, readiness and healtcheck
        // use onRequest's endResponse to short-circuit the request and therefore
        // not running this plugin at all
        plugins.unshift(configInServerContextPlugin);
      }
    },
  };
}
