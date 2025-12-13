import type { GraphiQLOptions, GraphiQLRenderer } from 'graphql-yoga';

export interface ApolloSandboxOptions {
  /**
   * The URL of the GraphQL endpoint that Sandbox introspects on initial load. Sandbox populates its pages using the schema obtained from this endpoint.
   * The default value is `http://localhost:4000`.
   * You should only pass non-production endpoints to Sandbox. Sandbox is powered by schema introspection, and we recommend [disabling introspection in production](https://www.apollographql.com/blog/graphql/security/why-you-should-disable-graphql-introspection-in-production/).
   * To provide a "Sandbox-like" experience for production endpoints, we recommend using either a [public variant](https://www.apollographql.com/docs/graphos/platform/graph-management/variants#public-variants) or the [embedded Explorer](https://www.apollographql.com/docs/graphos/platform/explorer/embed).
   */
  initialEndpoint?: string;
  /**
   * By default, the embedded Sandbox does not show the **Include cookies** toggle in its connection settings.Set `hideCookieToggle` to `false` to enable users of your embedded Sandbox instance to toggle the **Include cookies** setting.
   */
  hideCookieToggle?: boolean;
  /**
   * By default, the embedded Sandbox has a URL input box that is editable by users.Set endpointIsEditable to false to prevent users of your embedded Sandbox instance from changing the endpoint URL.
   */
  endpointIsEditable?: boolean;
  /**
   * You can set `includeCookies` to `true` if you instead want Sandbox to pass `{ credentials: 'include' }` for its requests.If you pass the `handleRequest` option, this option is ignored.Read more about the `fetch` API and credentials [here](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials).This config option is deprecated in favor of using the connection settings cookie toggle in Sandbox and setting the default value via `initialState.includeCookies`.
   */
  includeCookies?: boolean;
  /**
   * An object containing additional options related to the state of the embedded Sandbox on page load.
   */
  initialState?: InitialState;
  /**
   * Target HTML element
   */
  target?: string;
}

interface InitialState {
  /**
   * Set this value to `true` if you want Sandbox to pass `{ credentials: 'include' }` for its requests by default.If you set `hideCookieToggle` to `false`, users can override this default setting with the **Include cookies** toggle. (By default, the embedded Sandbox does not show the **Include cookies** toggle in its connection settings.)If you also pass the `handleRequest` option, this option is ignored.Read more about the `fetch` API and credentials [here](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials).
   */
  includeCookies?: boolean;
  /**
   * A URI-encoded operation to populate in Sandbox's editor on load.If you omit this, Sandbox initially loads an example query based on your schema.Example:
   * ```js
   * initialState: {
   *   document: `
   *    query ExampleQuery {
   *      books {
   *        title
   *      }
   *    }
   *  `
   * }
   * ```
   */
  document?: string;
  /**
   * A URI-encoded, serialized object containing initial variable values to populate in Sandbox on load.If provided, these variables should apply to the initial query you provide for [`document`](https://www.apollographql.com/docs/apollo-sandbox#document).Example:
   *
   * ```js
   * initialState: {
   *   variables: {
   *     userID: "abc123"
   *   },
   * }
   * ```
   */
  variables?: string;
  /**
   * A URI-encoded, serialized object containing initial HTTP header values to populate in Sandbox on load.Example:
   *
   *
   * ```js
   * initialState: {
   *   headers: {
   *     authorization: "Bearer abc123";
   *   }
   * }
   * ```
   */
  headers?: string;
  /**
   * The ID of a collection, paired with an operation ID to populate in Sandbox on load. You can find these values from a registered graph in Studio by clicking the **...** menu next to an operation in the Explorer of that graph and selecting **View  operation  details**.Example:
   *
   * ```js
   * initialState: {
   *   collectionId: 'abc1234',
   *   operationId: 'xyz1234'
   * }
   * ```
   */
  collectionId?: string;
  operationId?: string;
  /**
   * If `true`, the embedded Sandbox periodically polls your `initialEndpoint` for schema updates.The default value is `true`.Example:
   *
   * ```js
   * initialState: {
   *   pollForSchemaUpdates: false;
   * }
   * ```
   */
  pollForSchemaUpdates?: boolean;
  /**
   * Headers that are applied by default to every operation executed by the embedded Sandbox. Users can turn off the application of these headers, but they can't modify their values.The embedded Sandbox always includes these headers in its introspection queries to your `initialEndpoint`.Example:
   *
   * ```js
   * initialState: {
   *   sharedHeaders: {
   *     authorization: "Bearer abc123";
   *   }
   * }
   * ```
   */
  sharedHeaders?: Record<string, string>;
}

export function renderApolloSandbox(sandboxOpts?: ApolloSandboxOptions): GraphiQLRenderer {
  return function renderApolloSandbox(graphiqlOpts: GraphiQLOptions) {
    const includeCookies =
      graphiqlOpts.credentials === 'include' || graphiqlOpts.credentials === 'same-origin';
    const initialState: InitialState = {
      document: graphiqlOpts.defaultQuery,
      headers: graphiqlOpts.headers,
      sharedHeaders: graphiqlOpts.additionalHeaders,
      includeCookies,
      ...sandboxOpts?.initialState,
    };
    const endpoint = graphiqlOpts.endpoint
      ? JSON.stringify(graphiqlOpts.endpoint)
      : 'location.pathname';
    const finalOpts: ApolloSandboxOptions = {
      includeCookies,
      ...sandboxOpts,
      initialState,
    };
    return /* HTML */ `
      <!DOCTYPE html>
      <html style="height: 100%;" lang="en">
        <head>
          <title>Apollo Sandbox</title>
        </head>
        <body style="margin: 0;height: 100%;">
          <div style="width: 100%; height: 100%;" id="embedded-sandbox"></div>
          <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
          <script>
            const opts = ${JSON.stringify(finalOpts)};
            opts.initialEndpoint ||= new URL(${endpoint}, location.href).toString();
            opts.target ||= '#embedded-sandbox';
            new window.EmbeddedSandbox(opts);
          </script>
        </body>
      </html>
    `;
  };
}
