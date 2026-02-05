import { setTimeout } from 'node:timers/promises';
import { versionInfo } from 'graphql';
import Redis from 'ioredis';
import { useResponseCache } from '@envelop/response-cache';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  createRedisCache,
  defaultBuildRedisEntityId,
  defaultBuildRedisOperationResultCacheKey,
} from '../src/index.js';

jest.mock('ioredis', () => require('ioredis-mock'));

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(versionInfo.major >= 16)('useResponseCache with Redis cache', () => {
  const redis = new Redis();
  const cache = createRedisCache({ redis });

  beforeEach(async () => {
    jest.useRealTimers();
    await redis.flushall();
  });

  test('should create a default entity id with a number id', () => {
    const entityId = defaultBuildRedisEntityId('User', 1);
    expect(entityId).toEqual('User:1');
  });

  test('should create a default entity id with a string id', () => {
    const entityId = defaultBuildRedisEntityId('User', 'aaa-bbb-ccc-111-222');
    expect(entityId).toEqual('User:aaa-bbb-ccc-111-222');
  });

  test('should create a default key used to cache associated response operations', () => {
    const entityId = defaultBuildRedisOperationResultCacheKey('abcde123456XYZ=');
    expect(entityId).toEqual('operations:abcde123456XYZ=');
  });

  test('should reuse cache', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should purge cache on mutation', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(
      /* GraphQL */ `
        mutation test($id: ID!) {
          updateUser(id: $id) {
            id
          }
        }
      `,
      {
        id: 1,
      },
    );

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should purge cache on demand (typename+id)', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    await testInstance.execute(query);
    // get from cache
    await testInstance.execute(query);
    // so queried just once
    expect(spy).toHaveBeenCalledTimes(1);

    // we have our two Users
    expect(await redis.exists('User:1')).toBeTruthy();
    expect(await redis.exists('User:2')).toBeTruthy();
    // but not this one
    expect(await redis.exists('User:3')).toBeFalsy();

    // we have our two Comments
    expect(await redis.exists('Comment:1')).toBeTruthy();
    expect(await redis.exists('Comment:2')).toBeTruthy();
    // but not this one
    expect(await redis.exists('Comment:3')).toBeFalsy();

    const commentResultCacheKeys = await redis.smembers('Comment');
    // Comments are found in 1 ResultCacheKey
    expect(commentResultCacheKeys).toHaveLength(1);

    const comment1ResultCacheKeys = await redis.smembers('Comment:1');
    // Comment:1 is found in 1 ResultCacheKey
    expect(comment1ResultCacheKeys).toHaveLength(1);

    const comment2ResultCacheKeys = await redis.smembers('Comment:2');
    // Comment:2 is found in 1 ResultCacheKey
    expect(comment2ResultCacheKeys).toHaveLength(1);

    // then when we invalidate Comment:2
    await cache.invalidate([{ typename: 'Comment', id: 2 }]);

    // and get the all Comment(s) key
    const commentResultCacheKeysAfterInvalidation = await redis.smembers('Comment');

    // and the Comment:1 key
    const comment1ResultCacheKeysAfterInvalidation = await redis.smembers('Comment:1');

    // Comment:1 is found in 1 ResultCacheKey ...
    expect(comment1ResultCacheKeysAfterInvalidation).toHaveLength(1);
    // ... and Comment also is found in 1 key (the same result key)
    expect(commentResultCacheKeysAfterInvalidation).toHaveLength(1);

    expect(await redis.exists('Comment:1')).toBeTruthy();

    // but Comment:2 is no longer there since if was been invalidated
    expect(await redis.exists('Comment:2')).toBeFalsy();

    // query and cache since ws invalidated
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    // but since we've queried once before when we started above, we've now actually queried twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should purge cache on demand (typename)', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);

    // queried once
    expect(spy).toHaveBeenCalledTimes(1);

    expect(await redis.exists('User:1')).toBeTruthy();
    expect(await redis.exists('User:2')).toBeTruthy();
    expect(await redis.exists('User:3')).toBeFalsy();

    expect(await redis.exists('Comment:1')).toBeTruthy();
    expect(await redis.exists('Comment:2')).toBeTruthy();
    expect(await redis.exists('User:3')).toBeFalsy();

    await cache.invalidate([{ typename: 'Comment' }]);

    expect(await redis.exists('Comment')).toBeFalsy();
    expect(await redis.exists('Comment:1')).toBeFalsy();
    expect(await redis.exists('Comment:2')).toBeFalsy();
    expect(await redis.smembers('Comment')).toHaveLength(0);

    // we've invalidated so, now query and cache
    await testInstance.execute(query);
    // so have queried twice
    expect(spy).toHaveBeenCalledTimes(2);

    // from cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);

    // still just queried twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should indicate if the cache was hit or missed', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, cache, includeExtensionMetadata: true })],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    const queryResult = await testInstance.execute(query);
    assertSingleExecutionValue(queryResult);

    let cacheHitMaybe = queryResult['extensions']['responseCache']['hit'];
    expect(cacheHitMaybe).toBeFalsy();

    // get from cache
    const cachedResult = await testInstance.execute(query);

    assertSingleExecutionValue(cachedResult);
    cacheHitMaybe = cachedResult['extensions']['responseCache']['hit'];
    expect(cacheHitMaybe).toBeTruthy();

    const mutationResult = await testInstance.execute(
      /* GraphQL */ `
        mutation test($id: ID!) {
          updateUser(id: $id) {
            id
          }
        }
      `,
      {
        id: 1,
      },
    );

    assertSingleExecutionValue(mutationResult);
    cacheHitMaybe = mutationResult['extensions']['responseCache']['hit'];
    expect(cacheHitMaybe).toBeFalsy();
  });

  test('should purge cache on mutation and include invalidated entities', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, cache, includeExtensionMetadata: true })],
      schema,
    );

    const result = await testInstance.execute(
      /* GraphQL */ `
        mutation test($id: ID!) {
          updateUser(id: $id) {
            id
          }
        }
      `,
      {
        id: 1,
      },
    );

    assertSingleExecutionValue(result);
    const responseCache = result['extensions']['responseCache'];
    const invalidatedEntities = responseCache['invalidatedEntities'];
    expect(invalidatedEntities).toHaveLength(1);

    const invalidatedUser = invalidatedEntities[0];
    expect(invalidatedUser).toEqual({
      typename: 'User',
      id: '1',
    });
  });

  test('should consider variables when saving response', async () => {
    const spy = jest.fn((_, { limit }: { limit: number }) =>
      [
        {
          id: 1,
          name: 'User 1',
          comments: [
            {
              id: 1,
              text: 'Comment 1 of User 1',
            },
          ],
        },
        {
          id: 2,
          name: 'User 2',
          comments: [
            {
              id: 2,
              text: 'Comment 2 of User 2',
            },
          ],
        },
      ].slice(0, limit),
    );

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users(limit: Int!): [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test($limit: Int!) {
        users(limit: $limit) {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache 2 users
    await testInstance.execute(query, { limit: 2 });
    // fetch 2 users from cache
    await testInstance.execute(query, { limit: 2 });
    // so just one query
    expect(spy).toHaveBeenCalledTimes(1);

    // we should have one response with operations
    expect(await redis.keys('operations:*')).toHaveLength(1);

    // query just one user
    await testInstance.execute(query, { limit: 1 });

    // since 2 users are in cache, we query again for the 1 as a response
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should purge response after it expired', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, cache, ttl: 100 })],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    // so queried just once
    expect(spy).toHaveBeenCalledTimes(1);

    // let's travel in time beyond the ttl of 100
    await setTimeout(150);

    // since the cache has expired, now when we query
    await testInstance.execute(query);
    // we query again so now twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should cache responses based on session', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          cache,
          session(ctx: { sessionId: number }) {
            return ctx.sessionId + '';
          },
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(
      query,
      {},
      {
        sessionId: 1,
      },
    );
    await testInstance.execute(
      query,
      {},
      {
        sessionId: 1,
      },
    );
    expect(spy).toHaveBeenCalledTimes(1);

    // we should have one response for that sessionId of 1
    expect(await redis.keys('operations:*')).toHaveLength(1);

    await testInstance.execute(
      query,
      {},
      {
        sessionId: 2,
      },
    );
    expect(spy).toHaveBeenCalledTimes(2);

    // we should have one response for both sessions
    expect(await redis.keys('operations:*')).toHaveLength(2);
  });

  test('should skip cache of ignored types', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, cache, ignoredTypes: ['Comment'] })],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query but don't cache
    await testInstance.execute(query);

    // none of the queries entities are cached because contains Comment
    expect(await redis.exists('User')).toBeFalsy();
    expect(await redis.exists('User:1')).toBeFalsy();
    expect(await redis.exists('Comment')).toBeFalsy();
    expect(await redis.exists('Comment:2')).toBeFalsy();

    // since not cached
    await testInstance.execute(query);

    // still none of the queries entities are cached because contains Comment
    expect(await redis.exists('User')).toBeFalsy();
    expect(await redis.exists('User:1')).toBeFalsy();
    expect(await redis.exists('Comment')).toBeFalsy();
    expect(await redis.exists('Comment:2')).toBeFalsy();
    // we've queried twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('custom ttl per type', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          cache,
          ttl: 500,
          ttlPerType: {
            User: 200,
          },
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    // wait so User expires
    await setTimeout(201);

    await testInstance.execute(query);
    // now we've queried twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('custom ttl per schema coordinate', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          cache,
          ttl: 500,
          ttlPerSchemaCoordinate: {
            'Query.users': 200,
          },
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    // query and cache
    await testInstance.execute(query);
    // from cache
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    // wait so User expires
    await setTimeout(201);

    await testInstance.execute(query);
    // now we've queried twice
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
