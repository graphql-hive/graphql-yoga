import { AfterValidateHook } from '@envelop/core';
import { createGraphQLError } from '@graphql-tools/utils';
import { createSchema } from '../schema.js';
import { createYoga } from '../server.js';
import { maskError } from '../utils/mask-error.js';
import { Plugin } from './types.js';

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
        setResult([createGraphQLError('My Error', { extensions: { my: 'error' } })]);
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

  describe('onValidate', () => {
    it('should mask errors', async () => {
      const onValidatePlugin: Plugin = {
        onValidate({ setResult }) {
          setResult([
            createGraphQLError('UNMASKED ERROR', { extensions: { code: 'VALIDATION_ERROR' } }),
          ]);
        },
      };
      const yoga = createYoga({
        plugins: [onValidatePlugin],
        schema,
        maskedErrors: {
          maskError(error) {
            return maskError(error, 'MASKED ERROR');
          },
        },
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
        errors: [{ message: 'MASKED ERROR' }],
      });
    });

    it('should consistently return masked errors and log the original error across requests', async () => {
      const customMaskingFunction = jest.fn().mockImplementation(error => {
        return maskError(error, 'MASKED ERROR');
      });
      const loggerFn = jest.fn();
      const onValidatePlugin: Plugin = {
        onValidate({ setResult }) {
          return ({ result }) => {
            // this receives masked error from validation cache
            loggerFn(result[0].message);
            const maskedError = customMaskingFunction(
              createGraphQLError('MASKED ERROR', { extensions: { code: 'VALIDATION_ERROR' } }),
            );
            setResult([maskedError]);
          };
        },
      };

      const yoga = createYoga({
        plugins: [onValidatePlugin],
        schema,
        maskedErrors: {
          maskError: customMaskingFunction,
        },
      });

      const makeRequest = () =>
        yoga.fetch('http://localhost:3000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{invalid_hello}',
          }),
        });

      const [response1, response2] = await Promise.all([makeRequest(), makeRequest()]);

      const result1 = await response1.json();
      const result2 = await response2.json();

      expect(result1).toMatchObject({
        errors: [{ message: 'MASKED ERROR' }],
      });
      expect(result2).toMatchObject({
        errors: [{ message: 'MASKED ERROR' }],
      });

      expect(loggerFn.mock.calls.length).toEqual(2);
      expect(loggerFn.mock.calls[0][0]).toEqual(
        `Cannot query field "invalid_hello" on type "Query".`,
      );

      //fails with
      // Expected: "Cannot query field \"invalid_hello\" on type \"Query\"."
      // Received: "MASKED ERROR"
      expect(loggerFn.mock.calls[1][0]).toEqual(
        `Cannot query field "invalid_hello" on type "Query".`,
      );
    });
  });
});
