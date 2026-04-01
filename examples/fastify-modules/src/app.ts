import 'reflect-metadata';
import fastify, { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { createApplication } from 'graphql-modules';
import { createYoga } from 'graphql-yoga';
import { useGraphQLModules } from '@envelop/graphql-modules';
import { basicModule } from './modules/basic';

export function createGraphQLApp() {
  return createApplication({
    modules: [basicModule],
  });
}

export function createGraphQLHandler(): RouteHandlerMethod & {
  endpoint: string;
} {
  const graphQLServer = createYoga<{
    req: FastifyRequest;
    reply: FastifyReply;
  }>({
    logging: false,
    plugins: [useGraphQLModules(createGraphQLApp())],
  });

  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    const response = await graphQLServer.handleNodeRequestAndResponse(req, reply, {
      req,
      reply,
    });
    for (const [key, value] of response.headers.entries()) {
      reply.header(key, value);
    }

    reply.status(response.status);

    reply.send(response.body);

    return reply;
  };

  handler.endpoint = graphQLServer.graphqlEndpoint;
  return handler;
}

export function buildApp() {
  const app = fastify({ logger: false });
  const handler = createGraphQLHandler();

  app.route({
    url: handler.endpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler,
  });

  return [app, handler.endpoint] as const;
}
