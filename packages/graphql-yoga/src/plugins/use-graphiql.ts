import type { PromiseOrValue } from '@envelop/core';
import { YogaLogger } from '@graphql-yoga/logger';
import type { URLPattern } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import graphiqlHTML from '../graphiql-html.js';
import { FetchAPI } from '../types.js';
import { Plugin } from './types.js';

export function shouldRenderGraphiQL({ headers, method }: Request): boolean {
  return method === 'GET' && !!headers?.get('accept')?.includes('text/html');
}

type TabDefinition = { headers?: string | null; query: string | null; variables?: string | null };

export type GraphiQLOptions = {
  /**
   * Headers to be set when opening a new tab
   */
  defaultHeaders?: string;
  /**
   * An optional GraphQL string to use when no query is provided and no stored
   * query exists from a previous session.  If undefined is provided, GraphiQL
   * will use its own default query.
   */
  defaultQuery?: string;
  /**
   * This prop can be used to define the default set of tabs, with their
   * queries, variables, and headers. It will be used as default only if there
   * is no tab state persisted in storage.
   */
  defaultTabs?: TabDefinition[];
  /**
   * The initial headers to render inside the header editor. Defaults to `"{}"`.
   * The value should be a JSON encoded string, for example:
   * `headers: JSON.stringify({Authorization: "Bearer your-auth-key"})`
   */
  headers?: string;
  /**
   * This prop toggles if the contents of the headers editor are persisted in
   * storage.
   */
  shouldPersistHeaders?: boolean | undefined;
  /**
   * More info there: https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
   */
  credentials?: RequestCredentials;
  /**
   * The favicon URL to display for the page. Defaults to Yoga logo.
   */
  favicon?: string;
  /**
   * The title to display at the top of the page. Defaults to `"Yoga GraphiQL"`.
   */
  title?: string;
  /**
   * Logo to be displayed in the top right corner of GraphiQL.
   */
  logo?: string;
  /**
   * Protocol for subscriptions
   */
  subscriptionsProtocol?: 'SSE' | 'GRAPHQL_SSE' | 'WS' | 'LEGACY_WS';
  /**
   * Extra headers you always want to pass with users' headers input
   */
  additionalHeaders?: Record<string, string>;
  /**
   * HTTP method to use when querying the original schema.
   */
  method?: 'GET' | 'POST';
  /**
   * Whether to use the GET HTTP method for queries when querying the original schema
   */
  useGETForQueries?: boolean;
  /**
   * "external" fragments that will be included in the query document (depending on usage)
   */
  externalFragments?: string;
  /**
   * The maximum number of executed operations to store.
   * @default 20
   */
  maxHistoryLength?: number;
  /**
   * Whether target GraphQL server support deprecation of input values.
   * @default false
   */
  inputValueDeprecation?: boolean;
  /**
   * Custom operation name for the introspection query.
   */
  introspectionQueryName?: string;
  /**
   * Whether to include schema description in introspection query.
   * @default false
   */
  schemaDescription?: boolean;
  /**
   * Editor theme
   * @default "graphiql"
   */
  editorTheme?: string;
  /**
   *  Sets the key map to use when using the editor.
   * @default 'sublime'
   */
  keyMap?: 'sublime' | 'emacs' | 'vim';
  defaultEditorToolsVisibility?: boolean | 'variables' | 'headers';
  isHeadersEditorEnabled?: boolean;
  disableTabs?: boolean;
  /**
   * Whether to include `isRepeatable` flag on directives.
   * @default false
   */
  directiveIsRepeatable?: boolean;
  experimentalFragmentVariables?: boolean;
  /**
   * Set to `true` in order to convert all GraphQL comments (marked with # sign) to descriptions (""")
   * GraphQL has built-in support for transforming descriptions to comments (with `print`), but not while
   * parsing. Turning the flag on will support the other way as well (`parse`)
   */
  commentDescriptions?: boolean;
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  /**
   * Retry attempts
   */
  retry?: number;
  /**
   * The endpoint requests should be sent.
   * Defaults to the graphql endpoint ("/graphql" by default).
   */
  endpoint?: string;
};

/**
 * @deprecated replaced by GraphiQLOptions
 */
export type GraphiQLRendererOptions = GraphiQLOptions;

export const renderGraphiQL = (opts: GraphiQLOptions) =>
  graphiqlHTML
    .replace('__TITLE__', opts?.title || 'Yoga GraphiQL')
    .replace('__OPTS__', JSON.stringify(opts ?? {}));

export type GraphiQLOptionsFactory<TServerContext> = (
  request: Request,

  ...args: {} extends TServerContext
    ? [serverContext?: TServerContext | undefined]
    : [serverContext: TServerContext]
) => PromiseOrValue<GraphiQLOptions | boolean>;

export type GraphiQLOptionsOrFactory<TServerContext> =
  | GraphiQLOptions
  | GraphiQLOptionsFactory<TServerContext>
  | boolean;

export interface GraphiQLPluginConfig<TServerContext> {
  graphqlEndpoint: string;
  options?: GraphiQLOptionsOrFactory<TServerContext>;
  render?: GraphiQLRenderer;
  logger?: YogaLogger;
}

export type GraphiQLRenderer = (options: GraphiQLOptions) => PromiseOrValue<BodyInit>;

export function useGraphiQL<TServerContext extends Record<string, any>>(
  config: GraphiQLPluginConfig<TServerContext>,
): Plugin<{}, TServerContext> {
  const logger = config.logger ?? console;
  let graphiqlOptionsFactory: GraphiQLOptionsFactory<TServerContext>;
  if (typeof config?.options === 'function') {
    graphiqlOptionsFactory = config?.options;
  } else if (typeof config?.options === 'object') {
    graphiqlOptionsFactory = () => config?.options as GraphiQLOptions;
  } else if (config?.options === false) {
    graphiqlOptionsFactory = () => false;
  } else {
    graphiqlOptionsFactory = () => ({});
  }

  const renderer = config?.render ?? renderGraphiQL;
  let urlPattern: typeof URLPattern;
  const getUrlPattern = ({ URLPattern }: FetchAPI) => {
    urlPattern ||= new URLPattern({
      pathname: config.graphqlEndpoint,
    });
    return urlPattern;
  };
  return {
    onRequest({ request, serverContext, fetchAPI, endResponse, url }) {
      if (
        shouldRenderGraphiQL(request) &&
        (request.url.endsWith(config.graphqlEndpoint) ||
          request.url.endsWith(`${config.graphqlEndpoint}/`) ||
          url.pathname === config.graphqlEndpoint ||
          url.pathname === `${config.graphqlEndpoint}/` ||
          getUrlPattern(fetchAPI).test(url))
      ) {
        logger.debug(`Rendering GraphiQL`);
        return handleMaybePromise(
          () => graphiqlOptionsFactory(request, serverContext as TServerContext),
          graphiqlOptions => {
            if (graphiqlOptions) {
              return handleMaybePromise(
                () =>
                  renderer({
                    ...(graphiqlOptions === true ? {} : graphiqlOptions),
                  }),
                graphiqlBody => {
                  const response = new fetchAPI.Response(graphiqlBody, {
                    headers: {
                      'Content-Type': 'text/html',
                    },
                    status: 200,
                  });
                  endResponse(response);
                },
              );
            }
          },
        );
      }
    },
  };
}
