/* eslint-disable no-console */
import fastify from 'fastify';
import { execute, parse, subscribe, validate } from 'graphql';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  sendResult,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import 'reflect-metadata';
import { envelop, useEngine, useLogger, useSchema } from '@envelop/core';
import SchemaBuilder from '@pothos/core';
import RelayPlugin from '@pothos/plugin-relay';

interface AccountType {
  id: string;
  email: string;
  name: string;
}

export const builder = new SchemaBuilder({
  plugins: [RelayPlugin],
  relay: {},
});

const Account = builder.objectRef<AccountType>('Account');

builder.node(Account, {
  id: {
    resolve: account => account.id,
  },
  isTypeOf: source => typeof source === 'object' && source !== null && 'email' in source,
  fields: t => ({
    email: t.exposeString('email'),
    name: t.exposeString('name'),
  }),
});

const StatusEnum = builder.enumType('StatusEnum', {
  values: ['ACTIVE', 'DISABLED'] as const,
});

builder.queryType({
  fields: t => ({
    account: t.field({
      type: Account,
      args: {
        name: t.arg.string(),
        status: t.arg({
          type: StatusEnum,
        }),
      },
      resolve: () => ({ id: '1', name: 'test', email: 'test@test.com' }),
    }),
    accountsById: t.field({
      type: [Account],
      args: {
        ids: t.arg.intList(),
      },
      resolve: () => [{ id: '1', name: 'test', email: 'test@test.com' }],
    }),
  }),
});

const schema = builder.toSchema();

const getEnveloped = envelop({
  plugins: [useEngine({ parse, validate, execute, subscribe }), useSchema(schema), useLogger()],
});

const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped({
      req,
    });
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html');
      res.send(renderGraphiQL({}));
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request);
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      });

      sendResult(result, res.raw);

      // Tell fastify a response was sent
      res.sent = true;
    }
  },
});

app.listen({ port: 3000 }, () => {
  console.log(`GraphQL server is running.`);
});
