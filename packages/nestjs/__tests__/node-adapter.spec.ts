import { GraphQLBoolean, GraphQLNonNull, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { NodeAdapter, NodeRequest, NodeResponse } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { fetch } from '@whatwg-node/fetch';
import { AppModule } from './fixtures/graphql/app.module';
import { useTestApp } from './utils/app';

const { getUrl } = useTestApp(
  () =>
    Test.createTestingModule({
      imports: [
        AppModule.forRoot({
          conditionalSchema: new GraphQLSchema({
            query: new GraphQLObjectType({
              name: 'Query',
              fields: {
                hasNodeRequest: {
                  type: new GraphQLNonNull(GraphQLBoolean),
                  resolve: (_root, _args, { req, res }) =>
                    req instanceof NodeRequest && res instanceof NodeResponse,
                },
              },
            }),
          }),
        }),
      ],
    }).compile(),
  () => new NodeAdapter(),
);

it('should return query result', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        {
          getCats {
            id
            color
          }
        }
      `,
    }),
  });
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({
    data: { getCats: [{ id: 1, color: 'black' }] },
  });
});

it('should execute a query over GET', async () => {
  const res = await fetch(`${getUrl()}?query=${encodeURIComponent('{ getCats { id } }')}`);
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ data: { getCats: [{ id: 1 }] } });
});

it('should subscribe using sse', async () => {
  const sub = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        subscription {
          greetings
        }
      `,
    }),
  });
  expect(sub.headers.get('content-type')).toContain('text/event-stream');
  const text = await sub.text();
  for (const greeting of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
    expect(text).toContain(`data: {"data":{"greetings":"${greeting}"}}`);
  }
  expect(text).toContain('event: complete');
});

it('should pass the adapter request and response in the context', async () => {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: '{ hasNodeRequest }' }),
  });
  await expect(res.json()).resolves.toEqual({ data: { hasNodeRequest: true } });
});
