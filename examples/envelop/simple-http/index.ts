import { createServer } from 'http';
import { execute, parse, subscribe, validate } from 'graphql';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'World',
    },
  },
});

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});

const server = createServer((req, res) => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({
    req,
  });
  let payload = '';

  req.on('data', chunk => {
    payload += chunk.toString();
  });

  req.on('end', async () => {
    const { query, variables } = JSON.parse(payload);
    const document = parse(query);
    const validationErrors = validate(schema, document);

    if (validationErrors.length > 0) {
      res.end(
        JSON.stringify({
          errors: validationErrors,
        }),
      );

      return;
    }

    const context = await contextFactory();
    const result = await execute({
      document,
      schema,
      variableValues: variables,
      contextValue: context,
    });

    res.end(JSON.stringify(result));
  });
});

server.listen(3000);
