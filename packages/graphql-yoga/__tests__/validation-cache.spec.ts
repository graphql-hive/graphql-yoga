import { parse, validate, versionInfo } from 'graphql';
import type { Plugin } from '../src';
import { createSchema, createYoga } from '../src';

const nullVariableMessage =
  versionInfo.major >= 17
    ? 'Variable "$person" has invalid value: Expected value of non-null type "String!" not to be null.'
    : 'Variable "$person" of non-null type "String!" must not be null.';

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
    await expect(res.json()).resolves.toEqual({
      errors: [
        {
          locations: [{ column: 16, line: 1 }],
          message: nullVariableMessage,
        },
      ],
    });

    // second invalid request, cache hit
    res = await query(null);
    await expect(res.json()).resolves.toEqual({
      errors: [
        {
          locations: [{ column: 16, line: 1 }],
          message: nullVariableMessage,
        },
      ],
    });
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

describe('parser cache', () => {
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

  function createYogaWithParseSpy() {
    const parseFn = jest.fn(parse);
    const plugin: Plugin = {
      onParse({ setParseFn }) {
        setParseFn(parseFn);
      },
    };
    const yoga = createYoga({
      schema,
      plugins: [plugin],
    });
    async function query(query: string) {
      const response = await yoga.fetch('/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      return response.json();
    }
    return { parseFn, query };
  }

  test('caches small documents', async () => {
    const { parseFn, query } = createYogaWithParseSpy();
    await expect(query('{ hi }')).resolves.toEqual({ data: { hi: 'hi' } });
    await expect(query('{ hi }')).resolves.toEqual({ data: { hi: 'hi' } });
    expect(parseFn).toHaveBeenCalledTimes(1);
  });

  test('does not cache documents larger than the size limit', async () => {
    const { parseFn, query } = createYogaWithParseSpy();
    const document = '{ hi }' + ' '.repeat(1024 * 1024);
    await expect(query(document)).resolves.toEqual({ data: { hi: 'hi' } });
    await expect(query(document)).resolves.toEqual({ data: { hi: 'hi' } });
    expect(parseFn).toHaveBeenCalledTimes(2);
  });

  test('does not cache parse errors of documents larger than the size limit', async () => {
    const { parseFn, query } = createYogaWithParseSpy();
    const document = '{ hi ' + ' '.repeat(1024 * 1024);
    await query(document);
    await query(document);
    expect(parseFn).toHaveBeenCalledTimes(2);
  });

  test('evicts least recently used documents when the total size limit is exceeded', async () => {
    const { parseFn, query } = createYogaWithParseSpy();
    const first = '{ hi }' + ' '.repeat(600 * 1024);
    const second = '{ hi }' + '\n'.repeat(600 * 1024);
    await query(first);
    await query(second);
    expect(parseFn).toHaveBeenCalledTimes(2);
    await query(second);
    expect(parseFn).toHaveBeenCalledTimes(2);
    await query(first);
    expect(parseFn).toHaveBeenCalledTimes(3);
  });
});
