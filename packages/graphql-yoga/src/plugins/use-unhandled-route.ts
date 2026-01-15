import type { PromiseOrValue } from '@envelop/core';
import { isPromise } from '@graphql-tools/utils';
import type { URLPattern } from '@whatwg-node/fetch';
import landingPageBody from '../landing-page-html.js';
import { FetchAPI } from '../types.js';
import type { Plugin } from './types.js';

export interface LandingPageRendererOpts {
  request: Request;
  fetchAPI: FetchAPI;
  url: URL;
  graphqlEndpoint: string;
  // Not sure why the global `URLPattern` causes errors with the ponyfill typings
  // So instead we use this which points to the same type
  urlPattern: InstanceType<FetchAPI['URLPattern']>;
}

export type LandingPageRenderer = (opts: LandingPageRendererOpts) => PromiseOrValue<Response>;

export const defaultRenderLandingPage: LandingPageRenderer = function defaultRenderLandingPage(
  opts: LandingPageRendererOpts,
) {
  return new opts.fetchAPI.Response(
    landingPageBody
      .replace(/__GRAPHIQL_LINK__/g, opts.graphqlEndpoint)
      .replace(/__REQUEST_PATH__/g, opts.url.pathname),
    {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html',
      },
    },
  );
};

export function useUnhandledRoute(args: {
  graphqlEndpoint: string;
  landingPageRenderer?: LandingPageRenderer;
  showLandingPage: boolean;
}): Plugin {
  let urlPattern: typeof URLPattern;
  function getUrlPattern({ URLPattern }: FetchAPI) {
    urlPattern ||= new URLPattern({
      pathname: args.graphqlEndpoint,
    });
    return urlPattern;
  }
  const landingPageRenderer: LandingPageRenderer =
    args.landingPageRenderer || defaultRenderLandingPage;
  return {
    onRequest({ request, fetchAPI, endResponse, url }): PromiseOrValue<void> {
      if (
        !request.url.endsWith(args.graphqlEndpoint) &&
        !request.url.endsWith(`${args.graphqlEndpoint}/`) &&
        url.pathname !== args.graphqlEndpoint &&
        url.pathname !== `${args.graphqlEndpoint}/` &&
        !getUrlPattern(fetchAPI).test(url)
      ) {
        if (
          args.showLandingPage === true &&
          request.method === 'GET' &&
          !!request.headers?.get('accept')?.includes('text/html')
        ) {
          const landingPage$ = landingPageRenderer({
            request,
            fetchAPI,
            url,
            graphqlEndpoint: args.graphqlEndpoint,
            get urlPattern() {
              return getUrlPattern(fetchAPI);
            },
          });
          if (isPromise(landingPage$)) {
            return landingPage$.then(endResponse);
          }
          endResponse(landingPage$);
          return;
        }

        endResponse(
          new fetchAPI.Response('', {
            status: 404,
            statusText: 'Not Found',
          }),
        );
      }
    },
  };
}
