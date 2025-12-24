import { InMemoryLRUCache, type KeyValueCache } from '@apollo/utils.keyvaluecache';
import { isPromise, Plugin } from '@envelop/core';

interface DataSource {
  initialize?(config: {
    context?: Record<string, any>;
    cache?: KeyValueCache;
  }): void | Promise<void>;
}

export interface ApolloDataSourcesConfig {
  dataSources(): {
    [name: string]: DataSource;
  };
  cache?: KeyValueCache;
}

export function useApolloDataSources(config: ApolloDataSourcesConfig): Plugin {
  const cache = config.cache || new InMemoryLRUCache();

  return {
    onExecute({ extendContext, args }) {
      const dataSources = config.dataSources();
      const initializers: Array<Promise<void>> = [];
      for (const dataSource of Object.values(dataSources)) {
        if (dataSource.initialize) {
          const init$ = dataSource.initialize({
            context: args.contextValue,
            cache,
          });
          if (isPromise(init$)) {
            initializers.push(init$);
          }
        }
      }

      let init$: Promise<any> | undefined;
      if (initializers.length) {
        init$ = Promise.all(initializers);
      }

      if ('dataSources' in args.contextValue) {
        throw new Error(
          'Please use the dataSources config option instead of putting dataSources on the context yourself.',
        );
      }

      extendContext({
        dataSources,
      });

      return init$;
    },
  };
}
