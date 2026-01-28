import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('Batching', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String
        bye: String
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'hello',
        bye: () => 'bye',
      },
    },
  });
  it('should support batching for JSON requests', async () => {
    const yoga = createYoga({
      schema,
      batching: true,
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: query1 }, { query: query2 }]),
    });
    const result = await response.json();
    expect(result).toEqual([{ data: { hello: 'hello' } }, { data: { bye: 'bye' } }]);
  });
  it('should support batching for multipart requests', async () => {
    const yoga = createYoga({
      schema,
      batching: true,
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const formData = new yoga.fetchAPI.FormData();
    formData.append('operations', JSON.stringify([{ query: query1 }, { query: query2 }]));
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: formData,
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toEqual([{ data: { hello: 'hello' } }, { data: { bye: 'bye' } }]);
  });
  it('should throw if default limit is exceeded', async () => {
    const yoga = createYoga({
      schema,
      batching: true,
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
      ]),
    });
    expect(response.status).toBe(413);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is limited to 10 operations per request.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });
  it('should not support batching by default', async () => {
    const noBatchingYoga = createYoga({
      schema,
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await noBatchingYoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: query1 }, { query: query2 }]),
    });
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is not supported.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });
  it('should respect `batching.limit` option', async () => {
    const yoga = createYoga({
      schema,
      batching: {
        limit: 2,
      },
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: query1 }, { query: query2 }, { query: query1 }]),
    });

    expect(response.status).toBe(413);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is limited to 2 operations per request.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });
  it('should not allow batching if `batching: false`', async () => {
    const yoga = createYoga({
      schema,
      batching: false,
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: query1 }, { query: query2 }]),
    });
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is not supported.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });
  it('should not allow batching if `batching.limit` is 0', async () => {
    const yoga = createYoga({
      schema,
      batching: {
        limit: 0,
      },
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: query1 }, { query: query2 }]),
    });
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is not supported.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });
  it('should set `batching.limit` to 10 by default', async () => {
    const yoga = createYoga({
      schema,
      batching: {},
    });
    const query1 = /* GraphQL */ `
      query {
        hello
      }
    `;
    const query2 = /* GraphQL */ `
      query {
        bye
      }
    `;
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
        { query: query1 },
        { query: query2 },
      ]),
    });
    expect(response.status).toBe(413);
    const result = await response.json();
    expect(result).toEqual({
      errors: [
        {
          message: 'Batching is limited to 10 operations per request.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });

  it('batching context have different identity and properties are assignments are not shared', async () => {
    let i = 0;
    type Context = {
      i?: number;
    };
    const contexts = [] as Array<Context>;
    const yoga = createYoga({
      schema: createSchema({ typeDefs: `type Query { _: ID }` }),
      batching: true,
      plugins: [
        {
          onParams(ctx) {
            contexts.push(ctx.context);
          },
        },
      ],
      context() {
        i = i + 1;
        return { i };
      },
    });

    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ query: `query A {__typename}` }, { query: `query B {__typename}` }]),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toEqual([
      {
        data: { __typename: 'Query' },
      },
      {
        data: { __typename: 'Query' },
      },
    ]);

    expect(contexts.length).toEqual(2);
    expect(contexts[0]).not.toBe(contexts[1]);
    expect(contexts[0]!.i).toEqual(1);
    expect(contexts[1]!.i).toEqual(2);
  });
});
