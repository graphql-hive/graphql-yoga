import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { createSchema, createYoga } from 'graphql-yoga';
import Koa from 'koa';

export function buildApp() {
  const app = new Koa();

  const yoga = createYoga<Koa.ParameterizedContext>({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
          isKoa: Boolean
        }
        type Subscription {
          countdown(from: Int!): Int!
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
          isKoa: (_, __, context) => !!context.app,
        },
        Subscription: {
          countdown: {
            async *subscribe(_, { from }) {
              for (let i = from; i >= 0; i--) {
                await setTimeout$(1000);
                yield { countdown: i };
              }
            },
          },
        },
      },
    }),
    logging: false,
  });

  app.use(async ctx => {
    const response = await yoga.handleNodeRequestAndResponse(ctx.request, ctx.res, ctx);

    // Set status code
    ctx.status = response.status;

    // Set headers
    for (const [key, value] of response.headers.entries()) {
      ctx.append(key, value);
    }

    ctx.body = response.body;
  });

  return app;
}
