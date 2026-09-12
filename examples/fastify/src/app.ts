import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { createSchema, createYoga, Repeater, useExecutionCancellation } from 'graphql-yoga';
import { Logger } from '@graphql-hive/logger';
import { PinoLogWriter } from '@graphql-hive/logger/writers/pino';

export function buildApp(logging = true) {
  const app = fastify({
    logger: logging && {
      transport: {
        target: 'pino-pretty',
      },
      level: 'debug',
    },
  });

  const graphQLServer = createYoga<{
    req: FastifyRequest;
    reply: FastifyReply;
  }>({
    plugins: [useExecutionCancellation()],
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        scalar File

        type Query {
          hello: String
          isFastify: Boolean
          slow: Nested
        }
        type Mutation {
          hello: String
          getFileName(file: File!): String
        }
        type Subscription {
          countdown(from: Int!, interval: Int!): Int!
        }

        type Nested {
          field: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
          isFastify: (_, __, context) => !!context.req && !!context.reply,
          async slow(_, __, context) {
            await new Promise<void>((res, rej) => {
              context.req.log.info('Slow resolver invoked');

              const timeout = setTimeout(() => {
                context.req.log.info('Slow field resolved');
                res();
              }, 1000);

              context.request.signal.addEventListener('abort', () => {
                context.req.log.info('Slow field got cancelled');
                clearTimeout(timeout);
                rej(context.request.signal.reason);
              });
            });

            return {};
          },
        },
        Mutation: {
          hello: () => 'world',
          getFileName: (_, { file }: { file: File }) => file.name,
        },
        Subscription: {
          countdown: {
            async subscribe(_, { from, interval }, { request }) {
              return new Repeater(async (push, stop) => {
                const timeout = setInterval(() => {
                  push({ countdown: from });
                  from--;
                  if (from < 0) {
                    stop();
                    return;
                  }
                }, interval);

                stop.then(() => {
                  clearInterval(timeout);
                });

                request.signal.addEventListener('abort', () => {
                  app.log.info('countdown aborted');
                  stop();
                });
              });
            },
          },
        },
        Nested: {
          field(_, __, context) {
            context.req.log.info('Nested resolver called');
          },
        },
      },
    }),
    // Integrate Fastify Logger to Yoga
    logging: new Logger({ writers: [new PinoLogWriter(app.log)] }),
  });

  app.addContentTypeParser('multipart/form-data', {}, (_req, _payload, done) => done(null));

  app.route({
    url: graphQLServer.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) =>
      graphQLServer.handleNodeRequestAndResponse(req, reply, {
        req,
        reply,
      }),
  });

  return [app, graphQLServer.graphqlEndpoint] as const;
}
