import type { Context } from 'egg';
import { createYoga } from 'graphql-yoga';
import { schema } from './module/schema';

const yoga = createYoga<Context>({
  schema,
});

export const graphqlHandler = async (ctx: Context) => {
  const response = await yoga.handleNodeRequestAndResponse(ctx.request, ctx.res, ctx);
  // Set status code
  ctx.status = response.status;

  // Set headers
  for (const [key, value] of response.headers.entries()) {
    ctx.append(key, value);
  }

  ctx.body = response.body;
};
