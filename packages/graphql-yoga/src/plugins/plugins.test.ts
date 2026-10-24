import { GraphQLError } from 'graphql';
import type { AfterValidateHook } from '@envelop/core';
import { createSchema } from '../schema.js';
import { createYoga } from '../server.js';
import type { Plugin } from './types.js';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      _: String
    }
  `,
});

describe('Yoga Plugins', () => {
  it(`should respect Envelop's OnPluginInit's addPlugin`, async () => {
    const afterValidateHook: AfterValidateHook<Record<string, unknown>> = jest
      .fn()
      .mockImplementation(({ setResult }) => {
        setResult([new GraphQLError('My Error', { extensions: { my: 'error' } })]);
      });
    const testPlugin: Plugin = {
      onValidate() {
        return afterValidateHook;
      },
    };
    const testPluginToAdd: Plugin = {
      onPluginInit({ addPlugin }) {
        addPlugin(testPlugin);
      },
    };
    const yoga = createYoga({
      plugins: [testPluginToAdd],
      schema,
    });
    const response = await yoga.fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{hello}',
      }),
    });
    const result = await response.json();
    expect(result).toMatchObject({
      errors: [
        {
          extensions: {
            my: 'error',
          },
          message: 'My Error',
        },
      ],
    });
  });
});
