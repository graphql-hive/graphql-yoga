import 'graphiql/style.css';
import '@graphiql/plugin-explorer/style.css';
import { GraphiQL, GraphiQLProps } from 'graphiql';
import { DocumentNode, Kind, parse } from 'graphql';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import { Fetcher, FetcherOpts, FetcherParams } from '@graphiql/toolkit';
import { LoadFromUrlOptions, SubscriptionProtocol, UrlLoader } from '@graphql-tools/url-loader';
import 'json-bigint-patch';
import React, { useMemo } from 'react';
import { YogaLogo } from './YogaLogo';
import './styles.css';

const getOperationWithFragments = (
  document: DocumentNode,
  operationName?: string,
): DocumentNode => {
  const definitions = document.definitions.filter(definition => {
    if (
      definition.kind === Kind.OPERATION_DEFINITION &&
      operationName &&
      definition.name?.value !== operationName
    ) {
      return false;
    }
    return true;
  });

  return {
    kind: Kind.DOCUMENT,
    definitions,
  };
};

export type YogaGraphiQLProps = Partial<GraphiQLProps> &
  Partial<Omit<LoadFromUrlOptions, 'headers'>> & {
    title?: string | React.ReactNode;
    /**
     * Logo to be displayed in the top right corner
     */
    logo?: string | React.ReactNode;
    /**
     * Extra headers you always want to pass with users' headers input
     */
    additionalHeaders?: LoadFromUrlOptions['headers'];

    /**
     * @deprecated Use `initialQuery` instead.
     */
    query?: GraphiQLProps['initialQuery'];
    /**
     * @deprecated Use `initialHeaders` instead.
     */
    headers?: GraphiQLProps['initialHeaders'];
    /**
     * @deprecated Use `initialVariables` instead.
     */
    variables?: GraphiQLProps['initialVariables'];
  };

export function YogaGraphiQL(props: YogaGraphiQLProps): React.ReactElement {
  const initialQuery = /* GraphQL */ `#
# Welcome to ${props.title || 'Yoga GraphiQL'}
#
# ${props.title || 'Yoga GraphiQL'} is an in-browser tool for writing, validating, and
# testing GraphQL queries.
#
# Type queries into this side of the screen, and you will see intelligent
# typeaheads aware of the current GraphQL type schema and live syntax and
# validation errors highlighted within the text.
#
# GraphQL queries typically start with a "{" character. Lines that start
# with a # are ignored.
#
# An example GraphQL query might look like:
#
#     {
#       field(arg: "value") {
#         subField
#       }
#     }
#
# Keyboard shortcuts:
#
#  Prettify Query:  Shift-Ctrl-P (or press the prettify button above)
#
#     Merge Query:  Shift-Ctrl-M (or press the merge button above)
#
#       Run Query:  Ctrl-Enter (or press the play button above)
#
#   Auto Complete:  Ctrl-Space (or just start typing)
#
`;

  const endpoint = new URL(props.endpoint ?? location.pathname, location.href).toString();

  const urlLoader = useMemo(() => new UrlLoader(), []);

  const fetcher = useMemo(() => {
    if (props.fetcher) {
      if (props.endpoint) {
        // eslint-disable-next-line no-console
        console.warn(
          'You are using a custom fetcher and an endpoint. The endpoint will be ignored.',
        );
      }
      return props.fetcher;
    }
    const executor = urlLoader.getExecutorAsync(endpoint, {
      subscriptionsProtocol: SubscriptionProtocol.GRAPHQL_SSE,
      subscriptionsEndpoint: endpoint, // necessary because graphql-sse in graphql-tools url-loader defaults to endpoint+'/stream'
      credentials: 'same-origin',
      specifiedByUrl: true,
      directiveIsRepeatable: true,
      inputValueDeprecation: true,
      ...props,
      headers: props.additionalHeaders || {},
      fetch: (...args: Parameters<WindowOrWorkerGlobalScope['fetch']>) => globalThis.fetch(...args),
    });
    return function fetcher(graphQLParams: FetcherParams, opts?: FetcherOpts) {
      const document = getOperationWithFragments(
        parse(graphQLParams.query),
        graphQLParams.operationName ?? undefined,
      );
      return executor({
        document:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          document as any,
        operationName: graphQLParams.operationName ?? undefined,
        variables: graphQLParams.variables,
        extensions: {
          headers: opts?.headers,
        },
      });
    };
  }, [urlLoader, endpoint, props.fetcher]) as Fetcher;

  const explorer = explorerPlugin({
    showAttribution: true,
  });

  const currentUrl = new URL(location.href);
  const initialQueryFromUrl = currentUrl.searchParams.get('query') || props.query || initialQuery;

  const {
    query: deprecatedInitialQuery = initialQueryFromUrl,
    headers: deprecatedInitialHeaders,
    variables: deprecatedInitialVariables,
    ...otherProps
  } = props;

  return (
    <div className="graphiql-container">
      <GraphiQL
        // default values that can be override by props
        shouldPersistHeaders
        plugins={[explorer]}
        schemaDescription={true}
        inputValueDeprecation={true}
        isHeadersEditorEnabled
        defaultEditorToolsVisibility
        initialQuery={deprecatedInitialQuery}
        defaultHeaders={deprecatedInitialHeaders}
        initialVariables={deprecatedInitialVariables}
        onEditQuery={(query, ast) => {
          currentUrl.searchParams.set('query', query);
          history.replaceState({}, '', currentUrl);
          props.onEditQuery?.(query, ast);
        }}
        {...otherProps}
        fetcher={fetcher}
      >
        <GraphiQL.Logo>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {typeof props?.logo === 'string' ? (
              // if the logo is a string, then it's coming when rendering graphiql as a static page (see render-graphiql)
              <div
                style={{ width: 40, display: 'flex' }}
                dangerouslySetInnerHTML={{ __html: props.logo }}
              />
            ) : (
              // otherwise, it's used inside react and we can render it as a component
              <div style={{ width: 40, display: 'flex' }}>{props?.logo || <YogaLogo />}</div>
            )}
            {typeof props?.title === 'string' ? (
              // if the title is a string, then it's coming when rendering graphiql as a static page (see render-graphiql)
              <span dangerouslySetInnerHTML={{ __html: props.title }} />
            ) : (
              // otherwise, it's used inside react and we can render it as a component
              <span>
                {props?.title || (
                  <>
                    Yoga Graph
                    <em>i</em>
                    QL
                  </>
                )}
              </span>
            )}
          </div>
        </GraphiQL.Logo>
      </GraphiQL>
    </div>
  );
}
