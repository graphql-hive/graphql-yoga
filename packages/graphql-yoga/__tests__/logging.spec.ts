import { GraphQLError } from 'graphql';
import { jest } from '@jest/globals';
import { createGraphQLError, createSchema, createYoga, Logger, MemoryLogWriter } from '../src';

describe('logging', () => {
  describe('option', () => {
    it('logs at the `info` level by default', () => {
      expect(createYoga({}).log.level).toBe('info');
      expect(createYoga({ logging: true }).log.level).toBe('info');
    });
    it('is disabled with `false`', () => {
      expect(createYoga({ logging: false }).log.level).toBe(false);
    });
    it('accepts a log level', () => {
      expect(createYoga({ logging: 'warn' }).log.level).toBe('warn');
    });
    it('accepts a logger', () => {
      const logger = new Logger({ level: 'trace' });
      expect(createYoga({ logging: logger }).log).toBe(logger);
    });
  });

  it('custom logger', async () => {
    const writer = new MemoryLogWriter();
    const logger = new Logger({ level: 'debug', writers: [writer] });
    const yogaApp = createYoga({
      logging: logger,
    });

    await yogaApp.fetch('http://yoga/graphql?query={greetings}');

    expect(writer.logs).toContainEqual(
      expect.objectContaining({
        level: 'debug',
        msg: 'Parsing request to extract GraphQL parameters',
      }),
    );
  });
  describe('default logger', () => {
    it(`doesn't print debug messages if DEBUG env var isn't set`, () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ writers: [writer] });
      logger.debug('TEST');

      expect(writer.logs).toEqual([]);
    });
    it(`prints debug messages if DEBUG env var is set`, () => {
      const originalValue = process.env['DEBUG'];
      try {
        process.env['DEBUG'] = '1';

        const writer = new MemoryLogWriter();
        const logger = new Logger({ writers: [writer] });
        logger.debug('TEST');

        expect(writer.logs).toContainEqual(
          expect.objectContaining({ level: 'debug', msg: 'TEST' }),
        );
      } finally {
        process.env['DEBUG'] = originalValue;
      }
    });
  });

  describe('GraphQL error handling', () => {
    it('logs unexpected Errors', async () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ level: 'error', writers: [writer] });
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

      const errorLogs = writer.logs.filter(log => log.level === 'error');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0]).toEqual({
        level: 'error',
        attrs: {
          err: expect.objectContaining({ message: 'The database connection failed.' }),
          requestId: expect.any(String),
        },
      });
    });

    it('does not log unexpected GraphQL Errors (GraphQLError)', async () => {
      const logger = new Logger({ level: 'error' });
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
      const logger = new Logger({ level: 'error' });
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

  describe('request summary', () => {
    it('logs a `Request processed` summary at the `info` level', async () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ level: 'info', writers: [writer] });
      const yoga = createYoga({
        logging: logger,
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              greetings: String
            }
          `,
        }),
      });

      const response = await yoga.fetch(
        'http://yoga/graphql?query=query+Greet{greetings}&operationName=Greet',
        { headers: { accept: 'application/graphql-response+json' } },
      );

      expect(writer.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          msg: 'Request processed',
          attrs: expect.objectContaining({
            method: 'GET',
            path: '/graphql',
            operationName: 'Greet',
            operationType: 'query',
            status: response.status,
            errorCount: 0,
            durationMs: expect.any(Number),
          }),
        }),
      );
    });

    it('counts the GraphQL errors carried by the response', async () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ level: 'info', writers: [writer] });
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

      await yoga.fetch('http://yoga/graphql?query={hi}', {
        headers: { accept: 'application/graphql-response+json' },
      });

      expect(writer.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          msg: 'Request processed',
          attrs: expect.objectContaining({ status: 200, errorCount: 1 }),
        }),
      );
    });

    it('reports `batchedOperations` instead of a single operation name/type for batched requests', async () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ level: 'info', writers: [writer] });
      const yoga = createYoga({
        logging: logger,
        batching: true,
        schema: createSchema({
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
        }),
      });

      await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([{ query: '{hello}' }, { query: '{bye}' }]),
      });

      expect(writer.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          msg: 'Request processed',
          attrs: expect.objectContaining({
            batchedOperations: 2,
            errorCount: 0,
          }),
        }),
      );
    });

    it('does not log the summary when logging is disabled', async () => {
      const writer = new MemoryLogWriter();
      const logger = new Logger({ level: false, writers: [writer] });
      const yoga = createYoga({
        logging: logger,
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              greetings: String
            }
          `,
        }),
      });

      await yoga.fetch('http://yoga/graphql?query={greetings}');

      expect(writer.logs).toEqual([]);
    });
  });
});
