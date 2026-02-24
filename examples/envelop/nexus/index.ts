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
import {
  arg,
  enumType,
  intArg,
  interfaceType,
  list,
  makeSchema,
  objectType,
  queryType,
  stringArg,
} from 'nexus';
import 'reflect-metadata';
import { envelop, useLogger, useSchema } from '@envelop/core';

const Node = interfaceType({
  name: 'Node',
  definition(t) {
    t.id('id', { description: 'Unique identifier for the resource' });
  },
});
const Account = objectType({
  name: 'Account',
  isTypeOf(source) {
    return 'email' in source;
  },
  definition(t) {
    t.implements(Node); // or t.implements("Node")
    t.string('username');
    t.string('email');
  },
});
const StatusEnum = enumType({
  name: 'StatusEnum',
  members: ['ACTIVE', 'DISABLED'],
});
const Query = queryType({
  definition(t) {
    t.field('account', {
      type: Account, // or "Account"
      args: {
        name: stringArg(),
        status: arg({ type: 'StatusEnum' }),
      },
      resolve: () => ({ id: 1, username: 'test', email: 'test@mail.com' }),
    });
    t.field('accountsById', {
      type: list(Account), // or "Account"
      args: {
        ids: list(intArg()),
      },
      resolve: () => [{ id: 1, username: 'test', email: 'test@mail.com' }],
    });
  },
});

const schema = makeSchema({
  types: [Account, Node, Query, StatusEnum],
});

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
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

app.listen(3000, () => {
  console.log(`GraphQL server is running.`);
});
