import { ClientRequest } from 'node:http';
import type { GraphQLSchema } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { createSchema, createYoga, GraphQLParams, YogaInitialContext } from './src/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schema: GraphQLSchema = null as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const request: Request = null as any;

/**
 * TServerContext
 */

// none results in optional context
{
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRequest: ClientRequest = null as any;
  server.handleRequest(request, { req: clientRequest });
}

// Do not allow reserved context keys
{
  // @ts-expect-error ServerContext type cannot contain reserved key 'request'.
  createYoga<{}, { request: { myParam: string } }>({
    schema,
  });
}
{
  // @ts-expect-error ServerContext type cannot contain reserved key 'params'.
  createYoga<{}, { params: { myParam: string } }>({
    schema,
  });
}
{
  // @ts-expect-error ServerContext type cannot contain reserved key 'request'.
  createYoga<{}, { request: { myParam: string } }>({
    schema,
  });
}
{
  // @ts-expect-error ServerContext type cannot contain reserved key 'params'.
  createYoga<{ params: { myParam: string } }>({
    schema,
  });
}
// Allow reserved context keys if they match in ServerContext
{
  createYoga<{ request: Request }>({
    schema,
  });
}
{
  createYoga<{ params: GraphQLParams }>({
    schema,
  });
}
// Allow reserved context keys if they match in UserContext
{
  createYoga<{}, { request: Request }>({
    schema,
  });
}
{
  createYoga<{}, { params: GraphQLParams }>({
    schema,
  });
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
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            context.iAmHere;
          },
        },
      },
    }),
  });
}

// context can be accessed from within resolvers
{
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  createYoga<{}>({
    schema: createSchema({
      typeDefs: ``,
      resolvers: {
        Query: {
          foo: (_: unknown, __: unknown, context) => {
            // @ts-expect-error Property 'iAmHere' does not exist on type 'YogaInitialContext'.ts(2339)
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
