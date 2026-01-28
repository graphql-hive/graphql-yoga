import { GraphQLError } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';

describe('Response Caching via ETag', () => {
  describe.each([
    ['with includeExtensionMetadata', true],
    ['without includeExtensionMetadata', false],
  ])(`%s`, (_, includeExtensionMetadata) => {
    let resolverCalledCount = 0;
    afterEach(() => {
      resolverCalledCount = 0;
    });
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me(throwError: Boolean): User
          }
          type User {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            me: (_, { throwError }) => {
              if (throwError) throw new GraphQLError('Error');
              resolverCalledCount++;
              return {
                id: '1',
                name: 'Bob',
              };
            },
          },
        },
      }),
      logging: false,
      plugins: [
        useResponseCache({
          session: () => null,
          buildResponseCacheKey: async ({ documentString }) => documentString,
          includeExtensionMetadata,
        }),
      ],
    });
    it('should return an ETag header with the cache key', async () => {
      const query = '{me{id,name}}';
      const response = await yoga.fetch('http://localhost:4000/graphql?query=' + query);
      expect(response.headers.get('ETag')).toEqual(query);
      const lastModified = response.headers.get('Last-Modified');
      expect(lastModified).toBeTruthy();
      const lastModifiedDate = new Date(
        lastModified || 'Expected Last-Modified to be a valid date',
      );
      expect(lastModifiedDate).toBeInstanceOf(Date);
      expect(lastModifiedDate.toString()).not.toEqual('Invalid Date');
      expect(lastModifiedDate.getDate()).toEqual(new Date().getDate());
    });
    it('should respond 304 when the ETag and Last-Modified matches', async () => {
      const query = '{me{id,name}}';
      const response1 = await yoga.fetch('http://localhost:4000/graphql?query=' + query);
      const lastModified = response1.headers.get('Last-Modified');
      const response2 = await yoga.fetch('http://localhost:4000/graphql?query=' + query, {
        headers: {
          'If-None-Match': query,
          'If-Modified-Since': lastModified,
        },
      });
      expect(response2.status).toEqual(304);
      expect(resolverCalledCount).toEqual(0);
    });
    it('should not send ETag or Last-Modified if the result is not cached', async () => {
      const response = await yoga.fetch(
        'http://localhost:4000/graphql?query={me(throwError:true){id,name}}',
      );
      expect(response.headers.get('ETag')).toBeFalsy();
      expect(response.headers.get('Last-Modified')).toBeFalsy();
    });
    it('should not response 304 if ETag matches but Last-Modified does not', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const query = '{me{id,name}}';
      const response = await yoga.fetch('http://localhost:4000/graphql?query=' + query, {
        headers: {
          'If-None-Match': query,
          'If-Modified-Since': yesterday.toString(),
        },
      });
      expect(response.status).toEqual(200);
      // It should still hit the cache
      expect(resolverCalledCount).toEqual(0);
    });
  });
});
