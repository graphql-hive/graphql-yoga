import { ClientRequest } from 'node:http';
import type { GraphQLSchema } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { createSchema, createYoga, YogaInitialContext } from './src/index.js';

const schema: GraphQLSchema = null as any;

const request: Request = null as any;

/**
 * TServerContext
 */

// none results in optional context
{
  const server = createYoga<{}>({
    schema,
  });
  server.handleRequest(request, {});
}

// some results in mandatory context (error)

{
  const server = createYoga<{ req: ClientRequest }>({
    schema,
  });
  // @ts-expect-error Arguments for the rest parameter 'serverContext' were not provided.
  server.handleRequest(request);
}

// some results in mandatory context (success)
{
  const server = createYoga<{ req: ClientRequest }>({
    schema,
  });

  const clientRequest: ClientRequest = null as any;
  server.handleRequest(request, { req: clientRequest });
}

/**
 * Context + Resolvers
 */

// context can be accessed from within resolvers
{
  createYoga<{ iAmHere: 1 }>({
    schema: createSchema({
      typeDefs: ``,
      resolvers: {
        Query: {
          foo: (_: unknown, __: unknown, context) => {
            context.iAmHere;
          },
        },
      },
    }),
  });
}

// context can be accessed from within resolvers
{
  createYoga<{}>({
    schema: createSchema({
      typeDefs: ``,
      resolvers: {
        Query: {
          foo: (_: unknown, __: unknown, context) => {
            // @ts-expect-error Property 'iAmHere' does not exist on type 'YogaInitialContext'.ts(2339)

            context.iAmHere;
          },
        },
      },
    }),
  });
}

// context can be accessed when defined outside
{
  type Context = {
    brrt: 1;
  };

  const resolvers: IResolvers<unknown, YogaInitialContext & Context> = {
    Query: {
      foo: (_: unknown, __: unknown, context) => {
        context.brrt;
      },
    },
  };
  const schema = createSchema<Context>({
    typeDefs: ``,
    resolvers,
  });

  createYoga<Context>({
    schema,
  });
}

// fetch usage optional serverContext
{
  const server = createYoga<{}>({
    schema,
  });
  server.fetch('http://yoga/graphql?query={greetings}');
}

createYoga({
  graphiql: false,
});

createYoga({
  graphiql: true,
});

createYoga({
  graphiql: () => false,
});

createYoga({
  graphiql: () => true,
});

createYoga({
  graphiql: {},
});

createYoga({
  graphiql: () => ({}),
});
