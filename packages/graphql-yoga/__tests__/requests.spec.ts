import { OnExecuteHook } from '@envelop/core';
import { Request } from '@whatwg-node/fetch';
import { createSchema, createYoga, YogaInitialContext } from '../src';

describe('requests', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        ping: String
        requestUrl: String
      }
      type Mutation {
        echo(str: String): String
      }
    `,
    resolvers: {
      Query: {
        ping: () => 'pong',
        requestUrl: (_, __, ctx) => ctx.request.url,
      },
      Mutation: {
        echo(_, args) {
          return args.str;
        },
      },
    },
  });
  const endpoint = '/test-graphql';
  const yoga = createYoga({
    schema,
    logging: false,
    graphqlEndpoint: endpoint,
  });

  it('should reject other paths if specific endpoint path is provided', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'GET',
    });
    expect(response.status).toBe(404);
  });

  it('should support path patterns', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      graphqlEndpoint: '/:version/:path',
    });
    const response = await yoga.fetch('http://yoga/v1/mypath', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ requestUrl }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.requestUrl).toBe('http://yoga/v1/mypath');
  });

  it('supports trailing slash in url', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      graphqlEndpoint: '/graphql',
    });
    const response = await yoga.fetch('http://yoga/graphql/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ requestUrl }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.requestUrl).toBe('http://yoga/graphql/');
  });

  it('supports query params in url', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      graphqlEndpoint: '/graphql',
    });
    const response = await yoga.fetch('http://yoga/graphql?query=something+awesome', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ requestUrl }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.requestUrl).toBe('http://yoga/graphql?query=something+awesome');
  });

  it('allows you to bypass endpoint check with wildcard', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      graphqlEndpoint: '*',
    });
    const response = await yoga.fetch('http://yoga/random', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ ping }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });
  it('should send basic query', async () => {
    const response = await yoga.fetch('http://yoga/test-graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ ping }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('should send basic query with GET', async () => {
    const response = await yoga.fetch(
      `http://yoga/test-graphql?query=${encodeURIComponent('{ ping }')}`,
      {
        method: 'GET',
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('sending mutation over GET method is prohibited', async () => {
    const response = await yoga.fetch(
      `http://yoga/test-graphql?query=${encodeURIComponent('mutation { __typename }')}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/graphql-response+json',
        },
      },
    );

    expect(response.status).toBe(405);

    expect(response.headers.get('allow')).toEqual('POST');
    const body = await response.json();

    expect(body.data).toBeUndefined();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toEqual(
      'Can only perform a mutation operation from a POST request.',
    );
  });

  it('should send basic mutation', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            echo
          }
        `,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.echo).toBe(null);
  });

  it('should send variables', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Foo($text: String!) {
            echo(str: $text)
          }
        `,
        variables: { text: 'hello' },
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.echo).toBe('hello');
  });

  it('should error on malformed JSON parameters', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: '{ "query": "{ ping }"',
    });
    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.errors).toBeDefined();
    expect(body.data).toBeUndefined();
  });

  it('should error on invalid JSON parameters', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: '{ "query": "',
    });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toEqual('POST body sent invalid JSON.');

    expect(body.data).toBeUndefined();
  });

  it('should error on nullish JSON body', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: 'null',
    });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toEqual('POST body is expected to be object but received null');

    expect(body.data).toBeUndefined();
  });

  it('should error on non-object JSON body', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: '"body"',
    });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toEqual(
      'POST body is expected to be object but received string',
    );

    expect(body.data).toBeUndefined();
  });

  it('should error on malformed query string', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ query { ping }' }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.errors).toBeDefined();
    expect(body.data).toBeUndefined();
  });

  it('should error missing query', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: null }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.errors?.[0].message).toBe('Must provide query string.');
  });

  it('should error if query is not a string', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: { ping: 'pong' } }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.errors?.[0].message).toBe(
      'Expected "query" param to be a string, but given object.',
    );
  });

  it('should handle preflight requests correctly', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'OPTIONS',
      headers: {
        'content-type': 'application/json',
        'access-control-request-method': 'POST',
        origin: 'http://localhost:3000',
      },
    });

    expect(response.status).toEqual(204);
    expect(response.headers.get('access-control-allow-origin')).toEqual('http://localhost:3000');
    expect(response.headers.get('access-control-allow-methods')).toEqual('POST');
  });

  it('should handle POST requests with a GraphQL operation string', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/graphql',
      },
      body: '{ping}',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('should handle POST requests with url encoded string', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: `query=${encodeURIComponent('{ ping }')}`,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('should handle POST requests as JSON with "application/graphql+json" content type', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/graphql+json',
      },
      body: JSON.stringify({ query: '{ ping }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('errors if there is an invalid parameter in the request body', async () => {
    const response = await yoga.fetch(`http://yoga/test-graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/graphql+json',
      },
      body: JSON.stringify({ query: '{ ping }', test: 'a' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.errors?.[0].message).toBe('Unexpected parameter "test" in the request body.');
  });

  it('does not error if there is a specified invalid parameter in the request body', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      extraParamNames: ['test'],
    });
    const response = await yoga.fetch(`http://yoga/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/graphql+json',
      },
      body: JSON.stringify({ query: '{ ping }', test: 'a' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.ping).toBe('pong');
  });

  it('throws when there is an invalid parameter in the request body other than the specified invalid parameters', async () => {
    const yoga = createYoga({
      schema,
      logging: false,
      extraParamNames: ['test'],
    });
    const response = await yoga.fetch(`http://yoga/graphql`, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/graphql+json',
      },
      body: JSON.stringify({ query: '{ ping }', test2: 'a' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.errors?.[0].message).toBe('Unexpected parameter "test2" in the request body.');
  });

  it('should use supported accept header when multiple are provided', async () => {
    const response = await yoga.fetch('http://yoga/test-graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/xml, application/json',
      },
      body: JSON.stringify({ query: '{ ping }' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "ping": "pong",
        },
      }
    `);
  });

  it('should parse when multiple content-type headers are provided', async () => {
    const response = await yoga.fetch('http://yoga/test-graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json, application/json',
      },
      body: JSON.stringify({ query: '{ ping }' }),
    });

    expect(response.ok).toBeTruthy();
    const body = await response.json();
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "ping": "pong",
        },
      }
    `);
  });

  it('should return 415 unsupported media type when content-type is not supported', async () => {
    const response = await yoga.fetch('http://yoga/test-graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/xml',
      },
      body: `<query>{ ping }</query>`,
    });
    expect(response.status).toBe(415);
    const body = await response.text();
    expect(body).toBeFalsy();
  });

  it('contains the correct request object in the unique execution context', async () => {
    const onExecuteFn = jest.fn((() => undefined) as OnExecuteHook<YogaInitialContext>);
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            greetings: String
          }
        `,
        resolvers: {
          Query: {
            greetings: () => {
              return `Hello world!`;
            },
          },
        },
      }),
      plugins: [
        {
          onExecute: onExecuteFn,
        },
      ],
    });
    const env = {};
    const extraCtx = {};
    const firstReq = new Request('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ greetings }' }),
    });
    const firstRes = await yoga.fetch(firstReq, env, extraCtx);
    expect(firstRes.status).toBe(200);
    const firstResBody = await firstRes.json();
    expect(firstResBody.data.greetings).toBe('Hello world!');
    expect(onExecuteFn).toHaveBeenCalledTimes(1);
    expect(onExecuteFn.mock.calls[0]?.[0].args.contextValue.request).toBe(firstReq);
    const secondReq = new Request('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ greetings }' }),
    });
    const secondRes = await yoga.fetch(secondReq, env, extraCtx);
    expect(secondRes.status).toBe(200);
    const secondResBody = await secondRes.json();
    expect(secondResBody.data.greetings).toBe('Hello world!');
    expect(onExecuteFn).toHaveBeenCalledTimes(2);
    expect(onExecuteFn.mock.calls[1]?.[0].args.contextValue.request).toBe(secondReq);
    expect(onExecuteFn.mock.calls[1]?.[0].args.contextValue).not.toBe(
      onExecuteFn.mock.calls[0]![0].args.contextValue,
    );
  });
});
