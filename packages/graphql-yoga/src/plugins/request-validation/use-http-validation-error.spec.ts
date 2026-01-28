import { AfterValidateEventPayload } from '@envelop/core';
import { createSchema } from '../../schema.js';
import { createYoga } from '../../server.js';

describe('useHTTPValidationError', () => {
  describe('when doing a request with an invalid query', () => {
    it('does not overrite status code set on custom plugin', async () => {
      const schemaFactory = async () => {
        return createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              foo: String
            }
          `,
          resolvers: {
            Query: {
              foo: () => 'bar',
            },
          },
        });
      };
      const yoga = createYoga({
        schema: schemaFactory,
        plugins: [
          {
            onValidate() {
              return ({ valid, result }: AfterValidateEventPayload<Record<string, any>>) => {
                if (!valid) {
                  for (const error of result) {
                    error.extensions.http = {
                      status: 400,
                      spec: false,
                      headers: {
                        'custom-header': 'custom-value',
                      },
                    };
                  }
                }
              };
            },
          },
        ],
      });
      const result = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: 'query{bar}',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result.status).toEqual(400);
      expect(result.headers.get('custom-header')).toEqual('custom-value');
    });
  });
});
