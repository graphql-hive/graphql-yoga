import { GraphQLError } from 'graphql';
import { describe, expect, it, jest } from '@jest/globals';
import { createGraphQLError, createLogger, createSchema, createYoga } from '../src';

describe('logging', () => {
  it('custom logger', async () => {
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const yogaApp = createYoga({
      logging: logger,
    });

    await yogaApp.fetch('http://yoga/graphql?query={greetings}');

    expect(logger.debug).toHaveBeenCalledWith(`Parsing request to extract GraphQL parameters`);
  });
  describe('default logger', () => {
    it(`doesn't print debug messages if DEBUG env var isn't set`, () => {
      jest.spyOn(console, 'debug');
      const logger = createLogger();
      logger.debug('TEST');

      expect(console.debug).not.toHaveBeenCalled();
    });
    it(`prints debug messages if DEBUG env var is set`, () => {
      const originalValue = process.env['DEBUG'];
      try {
        process.env['DEBUG'] = '1';

        jest.spyOn(console, 'debug').mockImplementationOnce(() => {});
        const logger = createLogger();
        logger.debug('TEST');

        expect(console.debug).toHaveBeenCalled();
      } finally {
        process.env['DEBUG'] = originalValue;
      }
    });
  });

  describe('GraphQL error handling', () => {
    it('logs unexpected Errors', async () => {
      const logger = createLogger('error');
      const yoga = createYoga({
        logging: logger,
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: String
            }
          `,
          resolvers: {
            Query: {
              hi() {
                throw new Error('The database connection failed.');
              },
            },
          },
        }),
      });

      const mock = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{hi}' }),
        headers: {
          'content-type': 'application/json',
          accepy: 'application/json',
        },
      });

      expect(await response.text()).toMatchInlineSnapshot(
        `"{"errors":[{"message":"Unexpected error.","locations":[{"line":1,"column":2}],"path":["hi"],"extensions":{"code":"INTERNAL_SERVER_ERROR"}}],"data":{"hi":null}}"`,
      );

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(mock.mock.calls[0]).toMatchInlineSnapshot(`
        [
          [GraphQLError: The database connection failed.],
        ]
      `);
    });

    it('does not log unexpected GraphQL Errors (GraphQLError)', async () => {
      const logger = createLogger('error');
      const yoga = createYoga({
        logging: logger,
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: String
            }
          `,
          resolvers: {
            Query: {
              hi() {
                throw new GraphQLError('No hi for you ok.');
              },
            },
          },
        }),
      });

      jest.spyOn(logger, 'error').mockImplementation(() => undefined);

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{hi}' }),
        headers: {
          'content-type': 'application/json',
          accepy: 'application/json',
        },
      });

      expect(await response.text()).toMatchInlineSnapshot(
        `"{"errors":[{"message":"No hi for you ok.","locations":[{"line":1,"column":2}],"path":["hi"]}],"data":{"hi":null}}"`,
      );

      expect(logger.error).toHaveBeenCalledTimes(0);
    });

    it('does not log unexpeted GraphQL Errors (createGraphQLError)', async () => {
      const logger = createLogger('error');
      const yoga = createYoga({
        logging: logger,
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: String
            }
          `,
          resolvers: {
            Query: {
              hi() {
                throw createGraphQLError('No hi for you ok.');
              },
            },
          },
        }),
      });

      jest.spyOn(logger, 'error').mockImplementation(() => undefined);

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{hi}' }),
        headers: {
          'content-type': 'application/json',
          accepy: 'application/json',
        },
      });

      expect(await response.text()).toMatchInlineSnapshot(
        `"{"errors":[{"message":"No hi for you ok.","locations":[{"line":1,"column":2}],"path":["hi"]}],"data":{"hi":null}}"`,
      );

      expect(logger.error).toHaveBeenCalledTimes(0);
    });
  });
});
