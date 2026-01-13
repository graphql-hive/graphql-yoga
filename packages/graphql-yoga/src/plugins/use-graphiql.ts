import type { PromiseOrValue } from '@envelop/core';
import { YogaLogger } from '@graphql-yoga/logger';
import {
  GraphiQLOptions,
  GraphiQLOptionsFactory,
  GraphiQLOptionsOrFactory,
} from '@graphql-yoga/types';
import type { URLPattern } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import graphiqlHTML from '../graphiql-html.js';
import { FetchAPI } from '../types.js';
import { Plugin } from './types.js';

export function shouldRenderGraphiQL({ headers, method }: Request): boolean {
  return method === 'GET' && !!headers?.get('accept')?.includes('text/html');
}

/**
 * @deprecated replaced by GraphiQLOptions
 */
export type GraphiQLRendererOptions = GraphiQLOptions;

export const renderGraphiQL = (opts: GraphiQLOptions) =>
  graphiqlHTML
    .replace('__TITLE__', opts?.title || 'Yoga GraphiQL')
    .replace('__OPTS__', JSON.stringify(opts ?? {}));

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
