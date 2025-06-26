import { validate } from 'graphql';
import { createSchema, createYoga, Plugin } from '../src';

describe('validation cache', () => {
  test('validation is cached', async () => {
    const validateFn = jest.fn(validate);
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: String!
        }
      `,
      resolvers: {
        Query: {
          hi: () => 'hi',
        },
      },
    });
    const plugin: Plugin = {
      onValidate({ setValidationFn }) {
        setValidationFn(validateFn);
      },
    };
    const yoga = createYoga({
      schema,
      plugins: [plugin],
    });

    let response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ hi }' }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hi":"hi"}}"`);
    expect(validateFn).toHaveBeenCalledTimes(1);

    response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ hi }' }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hi":"hi"}}"`);
    expect(validateFn).toHaveBeenCalledTimes(1);
  });

  test('validation is cached with schema factory function', async () => {
    const validateFn = jest.fn(validate);
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: String!
        }
      `,
      resolvers: {
        Query: {
          hi: () => 'hi',
        },
      },
    });
    const plugin: Plugin = {
      onValidate({ setValidationFn }) {
        setValidationFn(validateFn);
      },
    };
    const yoga = createYoga({
      schema: () => schema,
      plugins: [plugin],
    });

    let response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ hi }' }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hi":"hi"}}"`);
    expect(validateFn).toHaveBeenCalledTimes(1);

    response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ hi }' }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hi":"hi"}}"`);
    expect(validateFn).toHaveBeenCalledTimes(1);
  });

  test('validation is cached per unique schema returned from factory function', async () => {
    const validateFn = jest.fn(validate);
    const firstSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: String!
          foo: String!
        }
      `,
      resolvers: {
        Query: {
          hi: () => 'hi',
          foo: () => 'foo',
        },
      },
    });
    const secondSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: String!
        }
      `,
      resolvers: {
        Query: {
          hi: () => 'hi',
        },
      },
    });

    const document = /* GraphQL */ `
      query {
        hi
        foo
      }
    `;

    let currentSchema = firstSchema;

    const plugin: Plugin = {
      onValidate({ setValidationFn }) {
        setValidationFn(validateFn);
      },
    };

    const yoga = createYoga({ schema: () => currentSchema, plugins: [plugin] });

    let response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: document }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(`"{"data":{"hi":"hi","foo":"foo"}}"`);

    expect(validateFn).toHaveBeenCalledTimes(1);

    currentSchema = secondSchema;

    response = await yoga.fetch('/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: document }),
    });
    expect(response.status).toEqual(200);
    expect(await response.text()).toMatchInlineSnapshot(
      `"{"errors":[{"message":"Cannot query field \\"foo\\" on type \\"Query\\".","locations":[{"line":4,"column":9}],"extensions":{"code":"GRAPHQL_VALIDATION_FAILED"}}]}"`,
    );

    expect(validateFn).toHaveBeenCalledTimes(2);
  });

  it('should miss cache if the query variables change', async () => {
    const validateFn = jest.fn(validate);
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hi(person: String): String!
          }
        `,
        resolvers: {
          Query: {
            hi: (_, args) => `Hi ${args.person}!`,
          },
        },
      }),
      plugins: [
        {
          onValidate({ setValidationFn }) {
            setValidationFn(validateFn);
          },
        } as Plugin,
      ],
    });

    const query = (person: string | null) =>
      yoga.fetch('/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          operationName: 'Welcomer',
          query: 'query Welcomer($person: String!) { hi(person: $person) }',
          variables: { person },
        }),
      });

    // first invalid request, will be cached
    let res = await query(null);
    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "locations": [
              {
                "column": 16,
                "line": 1,
              },
            ],
            "message": "Variable "$person" of non-null type "String!" must not be null.",
          },
        ],
      }
    `);

    // second invalid request, cache hit
    res = await query(null);
    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "locations": [
              {
                "column": 16,
                "line": 1,
              },
            ],
            "message": "Variable "$person" of non-null type "String!" must not be null.",
          },
        ],
      }
    `);
    expect(validateFn).toHaveBeenCalledTimes(1);

    // third request, valid, cache miss
    res = await query('John');
    await expect(res.json()).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "hi": "Hi John!",
        },
      }
    `);

    // validation function doesnt validate args
    expect(validateFn).toHaveBeenCalledTimes(1);
  });
});
