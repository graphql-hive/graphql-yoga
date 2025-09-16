/* eslint-disable */
import { createServer, type RequestListener } from 'http';
import { createYoga } from 'graphql-yoga';
import { App } from 'uWebSockets.js';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { Context, schema } from './schema.js';

const basicYoga = createYoga<Context>({
  schema,
  logging: false,
  multipart: false,
});

const yogaMap: Record<string, RequestListener> = {
  '/graphql': basicYoga,
  '/graphql-jit': createYoga<Context>({
    schema,
    logging: false,
    multipart: false,
    plugins: [
      useGraphQlJit({
        customJSONSerializer: true,
      }),
    ],
    graphqlEndpoint: '/graphql-jit',
  }),
  '/graphql-response-cache': createYoga<Context>({
    schema,
    logging: false,
    multipart: false,
    plugins: [
      useResponseCache({
        // global cache
        session: () => null,
      }),
    ],
    graphqlEndpoint: '/graphql-response-cache',
  }),
  '/graphql-no-parse-validate-cache': createYoga<Context>({
    schema,
    logging: false,
    multipart: false,
    parserAndValidationCache: false,
    graphqlEndpoint: '/graphql-no-parse-validate-cache',
  }),
  '/ping': (_, res) => {
    res.writeHead(200);
    res.end();
  },
};

const server = createServer((req, res) => {
  const yoga = yogaMap[req.url!];
  if (yoga) {
    yoga(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4000, () => {
  console.log('ready');
});

App()
  .any('/*', basicYoga)
  .listen(4001, listenSocket => {
    if (listenSocket) {
      console.log('ready');
    }
  });
