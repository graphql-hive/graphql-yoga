import { createYoga, YogaInitialContext } from 'graphql-yoga';
import SchemaBuilder from '@pothos/core';
import AuthzPlugin from '@pothos/plugin-authz';
import { useCookies } from '@whatwg-node/server-plugin-cookies';

const builder = new SchemaBuilder<{
  Context: YogaInitialContext;
}>({
  plugins: [AuthzPlugin],
});

builder.mutationType();
builder.queryType();

builder.queryField('get', t =>
  t.string({
    resolve: async (_p, _a, c, _i) => {
      const cookieVal = (await c.request.cookieStore?.get('test'))?.value;
      if (cookieVal === undefined) {
        throw new Error('No cookie set');
      }
      return cookieVal;
    },
  }),
);
builder.mutationField('set', t =>
  t.string({
    args: {
      value: t.arg.string({ required: true }),
    },
    resolve: async (_p, a, c, _i) => {
      await c.request.cookieStore?.set('test', a.value);
      return 'OK';
    },
  }),
);

const yoga = createYoga({
  schema: builder.toSchema(),
  plugins: [useCookies()],
});

Bun.serve({
  fetch: yoga,
  port: process.env['PORT'],
  hostname: '0.0.0.0',
});
