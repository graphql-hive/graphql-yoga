import { ExecutionResultWithSerializer, useGraphQlJit } from '@envelop/graphql-jit';
import { Plugin } from '@graphql-yoga/types';
import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

it('supports custom JSON serializer', async () => {
  const stringifyFn = jest.fn(() =>
    JSON.stringify({
      data: {
        hello: 'world',
      },
    }),
  );
  const useCustomSerializer: Plugin = {
    onExecute({ setExecuteFn }) {
      setExecuteFn(() => ({
        stringify: stringifyFn,
      }));
    },
  };
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
    }),
    plugins: [useCustomSerializer],
  });
  const res = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          hello
        }
      `,
    }),
  });

  const resJson = await res.json();
  expect(stringifyFn).toHaveBeenCalledTimes(1);
  expect(resJson).toMatchObject({
    data: {
      hello: 'world',
    },
  });
});

it('works with the custom serializer of GraphQL JIT', async () => {
  let stringifyFn: any;
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'world',
        },
      },
    }),
    plugins: [
      useGraphQlJit({
        customJSONSerializer: true,
      }),
      {
        onExecute() {
          return {
            onExecuteDone({ result }: { result: ExecutionResultWithSerializer }) {
              stringifyFn = result.stringify = jest.fn(result.stringify);
            },
          };
        },
      },
    ],
  });

  const res = await yoga.fetch('http://yoga/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          hello
        }
      `,
    }),
  });

  const resJson = await res.json();

  expect(resJson).toMatchObject({
    data: {
      hello: 'world',
    },
  });

  expect(stringifyFn).toHaveBeenCalledTimes(1);
});
