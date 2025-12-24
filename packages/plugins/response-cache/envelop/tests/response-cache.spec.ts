import { setTimeout } from 'node:timers/promises';
import * as GraphQLJS from 'graphql';
import { getIntrospectionQuery, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { envelop, useEngine, useExtendContext, useLogger, useSchema } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { useParserCache } from '@envelop/parser-cache';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
  TestkitInstance,
} from '@envelop/testing';
import { useValidationCache } from '@envelop/validation-cache';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mapSchema as cloneSchema } from '@graphql-tools/utils';
import {
  Cache,
  cacheControlDirective,
  createInMemoryCache,
  defaultBuildResponseCacheKey,
  ResponseCacheOnTtlFunction,
  useResponseCache,
} from '../src/index.js';

describe('useResponseCache', () => {
  beforeEach(() => jest.useRealTimers());

  it('deprecated ttlForType still work until removed', async () => {
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
          ttl: 0,
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await setTimeout(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('custom ttl per type is used instead of the global ttl - only enable caching for a specific type when the global ttl is 0', async () => {
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
          ttl: 0,
          ttlPerSchemaCoordinate: {
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await setTimeout(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('reuses the cache if the same query operation is executed in sequence without a TTL', async () => {
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

    const testInstance = createTestkit([useResponseCache({ session: () => null })], schema);

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

  it('ignore requests when enabled return false', async () => {
    const spy = jest.fn();
    const cache: Cache = {
      get: () => spy('get'),
      set: () => spy('set'),
      invalidate: () => spy('invalidate'),
    };
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
          users: () => [{ id: 1 }],
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          cache,
          enabled: () => false,
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).not.toHaveBeenCalled();
  });

  it('enable is called only once by request', async () => {
    const spy = jest.fn(() => false);
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
          users: () => [{ id: 1 }],
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          enabled: spy,
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
        }
      }
    `;
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('purges the cached query operation execution result upon executing a mutation that invalidates resources', async () => {
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
      [useResponseCache({ session: () => null, includeExtensionMetadata: true })],
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

    let result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: true });
    expect(spy).toHaveBeenCalledTimes(1);

    result = await testInstance.execute(
      /* GraphQL */ `
        mutation it($id: ID!) {
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
    expect(result?.extensions?.responseCache).toEqual({
      invalidatedEntities: [{ id: '1', typename: 'User' }],
    });
    expect(result.data).toEqual({
      updateUser: {
        id: '1',
      },
    });

    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges the cached query operation execution result upon executing a mutation that invalidates resources without having the id in the request', async () => {
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
              name: `User ${id}`,
            };
          },
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, includeExtensionMetadata: true })],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          name
          comments {
            id
            text
          }
        }
      }
    `;

    let result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: true });
    expect(spy).toHaveBeenCalledTimes(1);

    result = await testInstance.execute(
      /* GraphQL */ `
        mutation it($id: ID!) {
          updateUser(id: $id) {
            name
          }
        }
      `,
      {
        id: 1,
      },
    );
    assertSingleExecutionValue(result);
    expect(result?.extensions?.responseCache).toEqual({
      invalidatedEntities: [{ id: '1', typename: 'User' }],
    });

    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges the cached query operation execution result upon executing a mutation that invalidates resources & having useGraphQlJit plugin at the same time', async () => {
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
      [
        useGraphQlJit(),
        useResponseCache({
          session: () => null,
          includeExtensionMetadata: true,
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

    let result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: true });
    expect(spy).toHaveBeenCalledTimes(1);

    result = await testInstance.execute(
      /* GraphQL */ `
        mutation it($id: ID!) {
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
    expect(result?.extensions?.responseCache).toEqual({
      invalidatedEntities: [{ id: '1', typename: 'User' }],
    });

    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges cached query operation execution result via imperative cache.invalidate api using typename and id', async () => {
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

    const cache = createInMemoryCache();
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

    cache.invalidate([{ typename: 'Comment', id: 2 }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges cached null union query operation execution result via imperative cache.invalidate api using typename', async () => {
    const productsListingSpy = jest.fn(() => null);
    const productsSpy = jest.fn(() => null);
    const adsSpy = jest.fn(() => null);
    let id = 1;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          productsListing: [ProductListItem!]
          products: [Product!]
          ads: [Ad!]
        }

        type Mutation {
          addProduct(input: ProductInput!): Product!
        }

        input ProductInput {
          name: String!
        }

        union ProductListItem = Product | Ad

        type Product {
          id: ID!
          name: String!
        }

        type Ad {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          productsListing: productsListingSpy,
          products: productsSpy,
          ads: adsSpy,
        },
        Mutation: {
          addProduct(_, { input }) {
            const mockProduct = {
              id: id++,
              name: input.name,
            };
            return mockProduct;
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const productsListingQuery = /* GraphQL */ `
      query test {
        productsListing {
          ... on Product {
            id
            name
          }
          ... on Ad {
            id
            name
          }
        }
      }
    `;

    const productsQuery = /* GraphQL */ `
      query test {
        products {
          id
          name
        }
      }
    `;

    const adsQuery = /* GraphQL */ `
      query test {
        ads {
          id
          name
        }
      }
    `;

    await testInstance.execute(productsListingQuery);
    await testInstance.execute(productsListingQuery);
    expect(productsListingSpy).toHaveBeenCalledTimes(1);

    await testInstance.execute(productsQuery);
    await testInstance.execute(productsQuery);
    expect(productsSpy).toHaveBeenCalledTimes(1);

    await testInstance.execute(adsQuery);
    await testInstance.execute(adsQuery);
    expect(adsSpy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Product' }]);

    await testInstance.execute(productsListingQuery);
    expect(productsListingSpy).toHaveBeenCalledTimes(2);

    await testInstance.execute(productsQuery);
    expect(productsSpy).toHaveBeenCalledTimes(2);

    await testInstance.execute(adsQuery);
    expect(adsSpy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Ad' }]);
    await testInstance.execute(productsListingQuery);
    expect(productsListingSpy).toHaveBeenCalledTimes(3);

    await testInstance.execute(productsQuery);
    expect(productsSpy).toHaveBeenCalledTimes(2);

    await testInstance.execute(adsQuery);
    expect(adsSpy).toHaveBeenCalledTimes(2);
  });

  it('purges cached null query operation execution result via imperative cache.invalidate api using typename', async () => {
    const spy = jest.fn(() => null);
    let id = 1;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          products: [Product!]
        }

        type Mutation {
          addProduct(input: ProductInput!): Product!
        }

        input ProductInput {
          name: String!
        }

        type Product {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          products: spy,
        },
        Mutation: {
          addProduct(_, { input }) {
            const mockProduct = {
              id: id++,
              name: input.name,
            };
            return mockProduct;
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        products {
          id
          name
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Product' }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges cached empty array query operation execution result via imperative cache.invalidate api using typename', async () => {
    const spy = jest.fn(() => []);
    let id = 1;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          products: [Product!]!
        }

        type Mutation {
          addProduct(input: ProductInput!): Product!
        }

        input ProductInput {
          name: String!
        }

        type Product {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          products: spy,
        },
        Mutation: {
          addProduct(_, { input }) {
            const mockProduct = {
              id: id++,
              name: input.name,
            };
            return mockProduct;
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        products {
          id
          name
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Product' }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('purges cached query operation execution result via imperative cache.invalidate api using typename', async () => {
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

    const cache = createInMemoryCache();
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

    cache.invalidate([{ typename: 'Comment' }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('variables are used for constructing the cache key', async () => {
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

    const testInstance = createTestkit([useResponseCache({ session: () => null })], schema);

    const query = /* GraphQL */ `
      query it($limit: Int!) {
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

    await testInstance.execute(query, { limit: 2 });
    await testInstance.execute(query, { limit: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(query, { limit: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cached query execution results are purged after the ttl expires', async () => {
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
      [useResponseCache({ session: () => null, ttl: 100 })],
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    // let's travel in time beyond the ttl of 100
    await setTimeout(150);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('query execution results can be cached based on a session with the session parameter', async () => {
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
    await testInstance.execute(
      query,
      {},
      {
        sessionId: 2,
      },
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('query operations including ignored types are never cached', async () => {
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
      [useResponseCache({ session: () => null, ignoredTypes: ['Comment'] })],
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('custom ttl can be specified per object type and will be used over the default ttl for caching a query operation execution result if included in the operation document', async () => {
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await setTimeout(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('custom ttl can be specified per schema coordinate and will be used over the default ttl for caching a query operation execution result if included in the operation document', async () => {
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await setTimeout(200);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('global ttl is disabled when providing value 0, which results in query operation execution results to be never cached', async () => {
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

    const testInstance = createTestkit([useResponseCache({ session: () => null, ttl: 0 })], schema);

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
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not cache with a ttl of 0 defined by either directive, ttlPerType or ttlPerSchemaCoordinate options', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        ${cacheControlDirective}
        type Query {
          withDirective: String @cacheControl(maxAge: 0)
          withTtlPerSchemaCoordinate: String
          withTtlPerType: TypeWithoutCache
          withDefaultCache: String
        }

        type TypeWithoutCache {
          id: ID!
        }
      `,
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttlPerSchemaCoordinate: { 'Query.withTtlPerSchemaCoordinate': 0 },
          ttlPerType: { TypeWithoutCache: 0 },
          ttl: Infinity,
          includeExtensionMetadata: true,
        }),
      ],
      schema,
    );

    expect(
      await testInstance.execute(/* GraphQL */ `
        {
          withDefaultCache
        }
      `),
    ).toMatchObject({
      extensions: { responseCache: { didCache: true } },
    });
    expect(
      await testInstance.execute(/* GraphQL */ `
        {
          withDirective
        }
      `),
    ).toMatchObject({
      extensions: { responseCache: { didCache: false } },
    });
    expect(
      await testInstance.execute(/* GraphQL */ `
        {
          withTtlPerSchemaCoordinate
        }
      `),
    ).toMatchObject({
      extensions: { responseCache: { didCache: false } },
    });
    expect(
      await testInstance.execute(/* GraphQL */ `
        {
          withTtlPerType {
            id
          }
        }
      `),
    ).toMatchObject({
      extensions: { responseCache: { didCache: false } },
    });
  });

  it('schema coordinate ttl is prioritized over global ttl', async () => {
    const userSpy = jest.fn(() => [
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

    const orderSpy = jest.fn(() => [
      {
        id: 1,
        products: [
          {
            id: 1,
            name: 'Jeans',
          },
        ],
      },
      {
        id: 2,
        products: [
          {
            id: 2,
            name: 'Shoes',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
          orders: [Order!]!
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

        type Order {
          id: ID!
          products: [Product!]!
        }

        type Product {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          users: userSpy,
          orders: orderSpy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttl: 1,
          ttlPerSchemaCoordinate: {
            'Query.users': 200,
          },
          includeExtensionMetadata: true,
        }),
      ],
      schema,
    );

    const userQuery = /* GraphQL */ `
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

    const orderQuery = /* GraphQL */ `
      query test {
        orders {
          id
          products {
            id
            name
          }
        }
      }
    `;

    let result = await testInstance.execute(userQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 200,
      },
    });
    result = await testInstance.execute(orderQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 1,
      },
    });

    await setTimeout(5);
    await testInstance.execute(userQuery);
    await testInstance.execute(orderQuery);
    expect(userSpy).toHaveBeenCalledTimes(1);
    expect(orderSpy).toHaveBeenCalledTimes(2);
    await setTimeout(200);
    await testInstance.execute(userQuery);
    expect(userSpy).toHaveBeenCalledTimes(2);
  });

  it('ttl=0 and ttlPerType should cache correctly', async () => {
    const userSpy = jest.fn(() => [
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
          users: userSpy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttl: 0,
          ttlPerType: {
            User: 200,
          },
          includeExtensionMetadata: true,
        }),
      ],
      schema,
    );

    const userQuery = /* GraphQL */ `
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

    let result = await testInstance.execute(userQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 200,
      },
    });

    result = await testInstance.execute(userQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        hit: true,
      },
    });

    await setTimeout(200);

    result = await testInstance.execute(userQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 200,
      },
    });
  });

  it('execution results with errors are never cached by default', async () => {
    const spy = jest.fn(() => {
      throw new Error('Do not cache an error');
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it('custom shouldCache parameter can override the default behavior and cache execution results with errors', async () => {
    const spy = jest.fn(() => {
      throw new Error('Do not cache an error');
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
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
          // cache any query execution result
          shouldCacheResult: () => true,
        }),
      ],
      schema,
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    // the resolver is only called once as all following executions hit the cache
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it.skip('cache is purged upon mutation even when error is included in the mutation execution result', async () => {
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

    const errorSpy = jest.fn(() => {
      throw new Error('could not get name');
    });

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
              name: errorSpy,
            };
          },
        },
      },
    });

    const testInstance = createTestkit(
      [useResponseCache({ session: () => null, includeExtensionMetadata: true })],
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

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(
      /* GraphQL */ `
        mutation it($id: ID!) {
          updateUser(id: $id) {
            id
            name
          }
        }
      `,
      {
        id: 1,
      },
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('introspection query operation is not cached with default options', async () => {
    const introspectionQuery = getIntrospectionQuery();

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User!
        }
        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          user: {
            id: 1,
            name: 'User 1',
          },
        },
      },
    });

    // keeps track how often the '__Schema.queryType' resolver has been called
    // aka a introspection query operation has been executed
    // we wrap that field and increment the counter
    let introspectionCounter = 0;

    const schemaType = schema.getType('__Schema') as GraphQLObjectType;
    const schemaTypeQueryTypeField = schemaType.getFields()['queryType'];
    const originalResolve = schemaTypeQueryTypeField.resolve!;
    schemaTypeQueryTypeField.resolve = (...args) => {
      introspectionCounter++;
      return originalResolve(...args);
    };

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    // after each execution the introspectionCounter should be incremented by 1
    // as we never cache the introspection

    await testInstance.execute(introspectionQuery);
    expect(introspectionCounter).toEqual(1);

    await testInstance.execute(introspectionQuery);
    expect(introspectionCounter).toEqual(2);
  });

  it("introspection query operation can be cached via 'ttlPerSchemaCoordinate' option", async () => {
    const introspectionQuery = getIntrospectionQuery();

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User!
        }
        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          user: {
            id: 1,
            name: 'User 1',
          },
        },
      },
    });

    // keeps track how often the '__Schema.queryType' resolver has been called
    // aka a introspection query operation has been executed
    // we wrap that field and increment the counter
    let introspectionCounter = 0;

    const schemaType = schema.getType('__Schema') as GraphQLObjectType;
    const schemaTypeQueryTypeField = schemaType.getFields()['queryType'];
    const originalResolve = schemaTypeQueryTypeField.resolve!;
    schemaTypeQueryTypeField.resolve = (...args) => {
      introspectionCounter++;
      return originalResolve(...args);
    };

    const cache = createInMemoryCache();
    const testInstance = createTestkit(
      [
        useResponseCache({
          session: () => null,
          cache,
          ttlPerSchemaCoordinate: { 'Query.__schema': undefined },
        }),
      ],
      schema,
    );

    await testInstance.execute(introspectionQuery);
    // after the first execution the introspectionCounter should be incremented by 1
    expect(introspectionCounter).toEqual(1);

    await testInstance.execute(introspectionQuery);
    // as we now cache the introspection the resolver shall not be called for further introspections
    expect(introspectionCounter).toEqual(1);
  });

  it('query operation is not cached if an error occurs within a resolver', async () => {
    let usersResolverInvocationCount = 0;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String!
        }

        type Query {
          users: [User!]!
        }
      `,
      resolvers: {
        Query: {
          users: () => {
            usersResolverInvocationCount++;
            return null;
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ session: () => null, cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;

    await testInstance.execute(query);
    expect(usersResolverInvocationCount).toEqual(1);

    const testInstance2 = createTestkit([useResponseCache({ session: () => null, cache })], schema);
    await testInstance2.execute(query);
    expect(usersResolverInvocationCount).toEqual(2);
  });

  it('response cache works with validation cache and parser cache', async () => {
    const mockFn = jest.fn();
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: { Query: { foo: () => mockFn() || 'hi' } },
    });
    const testkit = createTestkit(
      [useValidationCache(), useResponseCache({ session: () => null }), useParserCache()],
      schema,
    );

    const document = /* GraphQL */ `
      query {
        foo
      }
    `;

    let result = await testkit.execute(document);
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "foo": "hi",
        },
      }
    `);
    result = await testkit.execute(document);
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "foo": "hi",
        },
      }
    `);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('does not stop other plugins from hooking into "onExecute" and "onExecuteDone"', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: { Query: { foo: () => 'hi' } },
    });
    const logs: Array<unknown> = [];
    const testkit = createTestkit(
      [
        useLogger({
          logFn: eventName => void logs.push(eventName),
        }),
        useResponseCache({
          session: () => null,
          ttlPerSchemaCoordinate: { 'Query.foo': Infinity },
        }),
      ],
      schema,
    );
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const result1 = await testkit.execute(operation);
    assertSingleExecutionValue(result1);
    const result2 = await testkit.execute(operation);
    assertSingleExecutionValue(result2);
    // ensure the response is served from the cache
    expect(result1).toBe(result2);
    // we had two invocations.
    expect(logs).toEqual(['execute-start', 'execute-end', 'execute-start', 'execute-end']);
  });

  describe('__typename related concerns', () => {
    it('keeps __typename in result if selected via selection set', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
            friends: [User!]!
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ id: 1, friends: [{ id: 2 }, { id: 3 }] }),
          },
        },
      });
      const testkit = createTestkit([useResponseCache({ session: () => null })], schema);
      const result = await testkit.execute(/* GraphQL */ `
        query {
          user {
            __typename
            id
            friends {
              __typename
              id
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          user: {
            __typename: 'User',
            id: '1',
            friends: [
              { __typename: 'User', id: '2' },
              { __typename: 'User', id: '3' },
            ],
          },
        },
      });
    });

    it('does not include __typename in result if not selected via selection set', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
            friends: [User!]!
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ id: 1, friends: [{ id: 2 }, { id: 3 }] }),
          },
        },
      });
      const testkit = createTestkit([useResponseCache({ session: () => null })], schema);
      const result = await testkit.execute(/* GraphQL */ `
        query {
          user {
            id
            friends {
              id
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          user: {
            id: '1',
            friends: [{ id: '2' }, { id: '3' }],
          },
        },
      });
    });

    it('does not include __typename in result if mot selected via selection set (union type)', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }

          union User = Admin | Customer

          type Admin {
            id: ID!
            login: String!
          }

          type Customer {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ __typename: 'Admin', id: 1, login: 'root' }),
          },
        },
      });
      const testkit = createTestkit([useResponseCache({ session: () => null })], schema);
      const result = await testkit.execute(/* GraphQL */ `
        query {
          user {
            ... on Admin {
              id
              login
            }
            ... on Customer {
              id
              name
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          user: {
            id: '1',
            login: 'root',
          },
        },
      });
    });

    it('works properly if __typename within selection set is aliased', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
            friends: [User!]!
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ id: 1, friends: [{ id: 2 }, { id: 3 }] }),
          },
        },
      });
      const testkit = createTestkit([useResponseCache({ session: () => null })], schema);
      const result = await testkit.execute(/* GraphQL */ `
        query {
          user {
            foo: __typename
            id
            friends {
              id
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          user: {
            foo: 'User',
            id: '1',
            friends: [{ id: '2' }, { id: '3' }],
          },
        },
      });
    });

    it('cache-hits for union fields', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            whatever: Whatever
          }

          interface Node {
            id: ID!
          }

          type Cat implements Node {
            id: ID!
          }

          type User implements Node {
            id: ID!
          }

          union Whatever = Cat | User
        `,
        resolvers: {
          Query: {
            whatever: () => ({ __typename: 'Cat', id: '1' }),
          },
        },
      });
      const operation = /* GraphQL */ `
        query {
          whatever {
            ... on Node {
              id
            }
          }
        }
      `;

      const cache = createInMemoryCache();
      const testkit = createTestkit(
        [useResponseCache({ session: () => null, includeExtensionMetadata: true, cache })],
        schema,
      );

      let result = await testkit.execute(operation);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          whatever: {
            id: '1',
          },
        },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
            ttl: Infinity,
          },
        },
      });
      result = await testkit.execute(operation);
      assertSingleExecutionValue(result);
      expect(result.extensions?.['responseCache']).toEqual({
        hit: true,
      });
      await cache.invalidate([{ typename: 'Cat', id: '1' }]);
      result = await testkit.execute(operation);
      assertSingleExecutionValue(result);
      expect(result.extensions?.['responseCache']).toEqual({
        didCache: true,
        hit: false,
        ttl: Infinity,
      });
    });

    it('works with parse caching', async () => {
      const schema = makeExecutableSchema({
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
      const operation = /* GraphQL */ `
        query {
          foo
        }
      `;
      const testkit = createTestkit(
        [
          useResponseCache({
            session: () => null,
            ttl: 0,
          }),
          useParserCache(),
        ],
        schema,
      );

      const result = await testkit.execute(operation);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          foo: 'bar',
        },
      });
      const cachedResult = await testkit.execute(operation);
      assertSingleExecutionValue(result);
      expect(cachedResult).toEqual({
        data: {
          foo: 'bar',
        },
      });
    });
    it("doesn't add a type name when not needed", async () => {
      expect.assertions(2);
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
            friends: [User!]!
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ id: 1, friends: [{ id: 2 }, { id: 3 }] }),
          },
        },
      });
      const testkit = createTestkit(
        [
          {
            onExecute({ setExecuteFn, executeFn }) {
              setExecuteFn(args => {
                const [rootSelection] = args.document.definitions[0].selectionSet.selections;
                const userSelections = rootSelection.selectionSet.selections;
                const friendsSelections = userSelections.find(
                  ({ name }: any) => name.value === 'friends',
                ).selectionSet.selections;
                const aliases = [...userSelections, ...friendsSelections].map(
                  ({ alias }: any) => alias?.value,
                );

                expect(aliases).not.toContain('__responseCacheTypeName');
                return executeFn(args);
              });
            },
          },
          useResponseCache({ session: () => null }),
        ],
        schema,
      );
      const result = await testkit.execute(/* GraphQL */ `
        query {
          user {
            __typename
            id
            friends {
              __typename
              id
            }
          }
        }
      `);
      assertSingleExecutionValue(result);
      expect(result).toEqual({
        data: {
          user: {
            __typename: 'User',
            id: '1',
            friends: [
              { __typename: 'User', id: '2' },
              { __typename: 'User', id: '3' },
            ],
          },
        },
      });
    });
  });
  it('supports @cacheControl directive with maxAge on a field', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @cacheControl(maxAge: Int) on FIELD_DEFINITION
        type Query {
          foo: String @cacheControl(maxAge: 10)
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'bar',
        },
      },
    });
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          includeExtensionMetadata: true,
        }),
      ],
      schema,
    );
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result.extensions?.['responseCache']).toEqual({
      didCache: true,
      hit: false,
      ttl: 10000,
    });
  });

  it('supports @cacheControl directive with maxAge on a type', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @cacheControl(maxAge: Int) on OBJECT
        type Query {
          foo: Foo
        }
        type Foo @cacheControl(maxAge: 10) {
          id: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => ({ id: 'baz' }),
        },
      },
    });
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          includeExtensionMetadata: true,
        }),
      ],
      schema,
    );
    const operation = /* GraphQL */ `
      {
        foo {
          id
        }
      }
    `;
    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result.extensions?.['responseCache']).toEqual({
      didCache: true,
      hit: false,
      ttl: 10000,
    });
  });

  describe('ignoring and ttl per type for types without id field', () => {
    let spyWithId: jest.Mock<{ id: Number; field: String }, []>;
    let spyWithoutId: jest.Mock<{ field: String }, []>;
    let schema: GraphQLSchema;

    beforeEach(() => {
      spyWithId = jest.fn(() => ({
        field: 'Hello World!',
        id: 1,
      }));

      spyWithoutId = jest.fn(() => ({
        field: 'Hello World!',
      }));

      schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type TypeWithId {
            id: Int!
            field: String!
          }
          type TypeWithoutId {
            field: String!
          }

          type Query {
            withId: TypeWithId!
            withoutId: TypeWithoutId!
          }
        `,
        resolvers: {
          Query: {
            withId: spyWithId,
            withoutId: spyWithoutId,
          },
        },
      });
    });

    describe('ignoredTypes', () => {
      let testInstance: TestkitInstance;

      beforeEach(() => {
        testInstance = createTestkit(
          [
            useResponseCache({
              session: () => null,
              ttl: 500,
              ignoredTypes: ['TypeWithId', 'TypeWithoutId'],
            }),
          ],
          schema,
        );
      });

      it('types with id field can be ignored when id is queried', async () => {
        const query = /* GraphQL */ `
          query test {
            withId {
              field
              id
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithId).toHaveBeenCalledTimes(2);
      });

      it('types with id field can be ignored when id is not queried', async () => {
        const query = /* GraphQL */ `
          query test {
            withId {
              field
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithId).toHaveBeenCalledTimes(2);
      });

      it('types without id field can be ignored', async () => {
        const query = /* GraphQL */ `
          query test {
            withoutId {
              field
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithoutId).toHaveBeenCalledTimes(2);
      });
    });

    describe('ttlPerType', () => {
      let testInstance: TestkitInstance;

      beforeEach(() => {
        testInstance = createTestkit(
          [
            useResponseCache({
              session: () => null,
              ttl: 0,
              ttlPerType: {
                TypeWithId: 500,
                TypeWithoutId: 500,
              },
            }),
          ],
          schema,
        );
      });

      it('ttl can be set for types with id field when id is queried', async () => {
        const query = /* GraphQL */ `
          query test {
            withId {
              field
              id
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithId).toHaveBeenCalledTimes(1);
      });

      it('ttl can be set for types with id field when id is not queried', async () => {
        const query = /* GraphQL */ `
          query test {
            withId {
              field
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithId).toHaveBeenCalledTimes(1);
      });

      it('ttl can be set for types without id', async () => {
        const query = /* GraphQL */ `
          query test {
            withoutId {
              field
            }
          }
        `;

        await testInstance.execute(query);
        await testInstance.execute(query);
        expect(spyWithoutId).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('keeps the existing extensions', async () => {
    const schema = makeExecutableSchema({
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
    const operation = /* GraphQL */ `
      query {
        foo
      }
    `;

    const cache = createInMemoryCache();
    const testkit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(() => ({
              data: {
                __responseCacheTypeName: 'Query',
                foo: 'bar',
              },
              extensions: {
                myExtension: 'myExtensionValue',
              },
            }));
          },
        },
        useResponseCache({ session: () => null, includeExtensionMetadata: true, cache }),
      ],
      schema,
    );

    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result).toEqual({
      data: {
        foo: 'bar',
      },
      extensions: {
        myExtension: 'myExtensionValue',
        responseCache: {
          didCache: true,
          hit: false,
          ttl: Infinity,
        },
      },
    });
  });
  it('keeps the existing response cache extensions', async () => {
    const schema = makeExecutableSchema({
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
    const operation = /* GraphQL */ `
      query {
        foo
      }
    `;

    const cache = createInMemoryCache();
    const testkit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(() => ({
              data: {
                __responseCacheTypeName: 'Query',
                foo: 'bar',
              },
              extensions: {
                responseCache: {
                  myExtension: 'myExtensionValue',
                },
              },
            }));
          },
        },
        useResponseCache({ session: () => null, includeExtensionMetadata: true, cache }),
      ],
      schema,
    );

    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result).toEqual({
      data: {
        foo: 'bar',
      },
      extensions: {
        responseCache: {
          myExtension: 'myExtensionValue',
          didCache: true,
          hit: false,
          ttl: Infinity,
        },
      },
    });
  });
  it('calls shouldCacheResult with correct parameters', async () => {
    const schema = makeExecutableSchema({
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
    const operation = /* GraphQL */ `
      query {
        foo
      }
    `;

    const shouldCacheResult = jest.fn(() => true);
    const cache = createInMemoryCache();
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          cache,
          shouldCacheResult,
        }),
      ],
      schema,
    );

    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    const cacheKey = await defaultBuildResponseCacheKey({
      documentString: operation,
      variableValues: {},
      sessionId: null,
    });
    expect(shouldCacheResult).toHaveBeenCalledWith({
      cacheKey,
      result,
    });
  });

  describe('supports scope', () => {
    it('should not cache response with a type with a PRIVATE scope for request without session', async () => {
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
            ttl: 200,
            scopePerSchemaCoordinate: {
              User: 'PRIVATE',
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

      await testInstance.execute(query);
      await testInstance.execute(query);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should not cache response with a type with a PRIVATE scope for request without session using @cachControl directive', async () => {
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
          ${cacheControlDirective}
          type Query {
            users: [User!]!
          }

          type User @cacheControl(scope: PRIVATE) {
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
            ttl: 200,
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

      await testInstance.execute(query);
      await testInstance.execute(query);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should not cache response with a field with PRIVATE scope for request without session', async () => {
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
            ttl: 200,
            scopePerSchemaCoordinate: {
              'User.name': 'PRIVATE',
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

      await testInstance.execute(query);
      await testInstance.execute(query);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should not cache response with a field with PRIVATE scope for request without session using @cachControl directive', async () => {
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
          ${cacheControlDirective}
          type Query {
            users: [User!]!
          }

          type User {
            id: ID!
            name: String! @cacheControl(scope: PRIVATE)
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
            ttl: 200,
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

      await testInstance.execute(query);
      await testInstance.execute(query);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should cache correctly for session with ttl being a valid number', async () => {
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
          ${cacheControlDirective}
          type Query {
            users: [User!]!
          }

          type User {
            id: ID!
            name: String! @cacheControl(scope: PRIVATE)
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

      const cache: Cache = {
        get: jest.fn(),
        set: jest.fn(),
        invalidate: () => {},
      };
      const testInstance = createTestkit(
        [
          useResponseCache({
            session: () => 'PHP BOSS',
            cache,
            ttl: 200,
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

      await testInstance.execute(query);
      expect(cache.get).toHaveBeenCalledWith(
        'c3b653bbea8797070b0072c7d9b7f69ad28f24f4cf0fae91fcaadd205e87880d',
      );
      expect(cache.set).toHaveBeenCalledWith(
        'c3b653bbea8797070b0072c7d9b7f69ad28f24f4cf0fae91fcaadd205e87880d',
        {
          data: {
            users: [
              { comments: [{ id: '1', text: 'Comment 1 of User 1' }], id: '1', name: 'User 1' },
              { comments: [{ id: '2', text: 'Comment 2 of User 2' }], id: '2', name: 'User 2' },
            ],
          },
        },
        expect.any(Object),
        200,
      );
    });

    it('should cache correctly for session with ttl being Infinity', async () => {
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
          ${cacheControlDirective}
          type Query {
            users: [User!]!
          }

          type User {
            id: ID!
            name: String! @cacheControl(scope: PRIVATE)
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

      const cache: Cache = {
        get: jest.fn(),
        set: jest.fn(),
        invalidate: () => {},
      };
      const testInstance = createTestkit(
        [
          useResponseCache({
            session: () => 'PHP BOSS',
            cache,
            ttl: Infinity,
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

      await testInstance.execute(query);
      expect(cache.get).toHaveBeenCalledWith(
        'c3b653bbea8797070b0072c7d9b7f69ad28f24f4cf0fae91fcaadd205e87880d',
      );
      expect(cache.set).toHaveBeenCalledWith(
        'c3b653bbea8797070b0072c7d9b7f69ad28f24f4cf0fae91fcaadd205e87880d',
        {
          data: {
            users: [
              { comments: [{ id: '1', text: 'Comment 1 of User 1' }], id: '1', name: 'User 1' },
              { comments: [{ id: '2', text: 'Comment 2 of User 2' }], id: '2', name: 'User 2' },
            ],
          },
        },
        expect.any(Object),
        Infinity,
      );
    });
  });

  it('should cache queries using @stream', async () => {
    const spy = jest.fn(async function* () {
      yield {
        id: 1,
        name: 'User 1',
        comments: [{ id: 1, text: 'Comment 1 of User 1' }],
      };
      yield { id: 2, name: 'User 2', comments: [] };
      await new Promise(process.nextTick);
      yield { id: 3, name: 'User 3', comments: [] };
    });
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @stream on FIELD

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

    const testInstance = createTestkit(
      envelop({
        plugins: [
          useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
          useSchema(cloneSchema(schema)),
          useResponseCache({ session: () => null }),
        ],
      }),
    );

    const query = /* GraphQL */ `
      query test {
        users @stream {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await waitForResult(testInstance.execute(query));
    expect(await waitForResult(testInstance.execute(query))).toEqual({
      data: {
        users: [
          {
            id: '1',
            name: 'User 1',
            comments: [{ id: '1', text: 'Comment 1 of User 1' }],
          },
          { id: '2', name: 'User 2', comments: [] },
          { id: '3', name: 'User 3', comments: [] },
        ],
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should cache queries using @defer', async () => {
    const spy = jest.fn(async function* () {
      yield {
        id: 1,
        name: 'User 1',
        comments: [{ id: 1, text: 'Comment 1 of User 1' }],
      };
      yield { id: 2, name: 'User 2', comments: [] };
      await new Promise(process.nextTick);
      yield { id: 3, name: 'User 3', comments: [] };
    });
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @defer on FRAGMENT_SPREAD | INLINE_FRAGMENT

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

    const testInstance = createTestkit(
      envelop({
        plugins: [
          useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
          useSchema(cloneSchema(schema)),
          useResponseCache({ session: () => null, includeExtensionMetadata: true }),
        ],
      }),
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name

          ... on User @defer {
            comments {
              id
              text
            }
          }
        }
      }
    `;

    await waitForResult(testInstance.execute(query));
    expect(await waitForResult(testInstance.execute(query))).toEqual({
      data: {
        users: [
          {
            id: '1',
            name: 'User 1',
            comments: [{ id: '1', text: 'Comment 1 of User 1' }],
          },
          { id: '2', name: 'User 2', comments: [] },
          { id: '3', name: 'User 3', comments: [] },
        ],
      },
      extensions: { responseCache: { hit: true } },
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should allow subscriptions', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield value;
      }
    };

    const teskit = createTestkit(
      [
        useResponseCache({
          session: () => null,
        }),
      ],
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me: String!
          }
          type Subscription {
            alphabet: String!
          }
        `,
        resolvers: {
          Subscription: {
            alphabet: {
              subscribe: () => streamExecuteFn(),
              resolve: value => value,
            },
          },
        },
      }),
    );

    const result = await teskit.execute(/* GraphQL */ `
      subscription {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    expect(values).toEqual([
      { data: { alphabet: 'a' } },
      { data: { alphabet: 'b' } },
      { data: { alphabet: 'c' } },
      { data: { alphabet: 'd' } },
    ]);
  });

  it('should allow subscriptions and query in the same request', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield value;
      }
    };

    const spy = jest.fn(() => 'me');

    const teskit = createTestkit(
      [
        useResponseCache({
          session: () => null,
        }),
      ],
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me: String!
          }
          type Subscription {
            alphabet: String!
          }
        `,
        resolvers: {
          Query: {
            me: spy,
          },
          Subscription: {
            alphabet: {
              subscribe: () => streamExecuteFn(),
              resolve: value => value,
            },
          },
        },
      }),
    );

    const operation = /* GraphQL */ `
      query Foo {
        me
      }
      subscription Sub {
        alphabet
      }
    `;

    let result = await teskit.execute(operation, {}, {}, 'Sub');
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    expect(values).toEqual([
      { data: { alphabet: 'a' } },
      { data: { alphabet: 'b' } },
      { data: { alphabet: 'c' } },
      { data: { alphabet: 'd' } },
    ]);

    result = await teskit.execute(operation, {}, {}, 'Foo');
    assertSingleExecutionValue(result);
    expect(result).toEqual({ data: { me: 'me' } });
    result = await teskit.execute(operation, {}, {}, 'Foo');
    assertSingleExecutionValue(result);
    expect(result).toEqual({ data: { me: 'me' } });
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('should invalidate cache queries using @defer', async () => {
    const spy = jest.fn(async function* () {
      yield {
        id: 1,
        name: 'User 1',
        comments: [{ id: 1, text: 'Comment 1 of User 1' }],
      };
      yield { id: 2, name: 'User 2', comments: [] };
      await new Promise(process.nextTick);
      yield { id: 3, name: 'User 3', comments: [] };
    });
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @defer on FRAGMENT_SPREAD | INLINE_FRAGMENT

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
        Mutation: {
          updateUser: () => ({ id: 3, name: 'User 3', comments: [] }),
        },
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      envelop({
        plugins: [
          useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
          useSchema(cloneSchema(schema)),
          useResponseCache({ session: () => null, includeExtensionMetadata: true }),
        ],
      }),
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;

    await testInstance.execute(query);
    await waitForResult(
      testInstance.execute(/* GraphQL */ `
        mutation {
          updateUser(id: "3") {
            id
            ... on User @defer {
              comments {
                id
                text
              }
            }
          }
        }
      `),
    );
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not leak __responseCacheTypeName or __responseCacheId', async () => {
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
        ${cacheControlDirective}

        type Query {
          users: [User!]! @cacheControl(scope: PRIVATE)
        }

        type User {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          users: () => [{ id: 1 }],
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ session: () => null })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
        }
      }
    `;

    const result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result).toEqual({ data: { users: [{ id: '1' }] } });
  });

  async function waitForResult(result: any) {
    result = await result;
    if (result.next) {
      let res = [];
      for await (const r of result) {
        res.push(r);
      }
      return res;
    }

    return result;
  }
});

it('calls enabled fn after context building', async () => {
  expect.assertions(2);
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo: String
      }
    `,
    resolvers: { Query: { foo: () => 'hi' } },
  });
  const testkit = createTestkit(
    [
      useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
      useExtendContext(() => ({ foo: 'bar' })),
      useResponseCache({
        session: () => null,
        ttlPerSchemaCoordinate: { 'Query.foo': Infinity },
        enabled: context => {
          expect(context).toMatchObject({ foo: 'bar' });
          return true;
        },
      }),
    ],
    schema,
  );

  const document = /* GraphQL */ `
    query {
      foo
    }
  `;

  const result = await testkit.execute(document, { foo: 'bar' });
  assertSingleExecutionValue(result);
  expect(result).toMatchObject({
    data: {
      foo: 'hi',
    },
  });
});

it('array of primitives is returned correctly (issue #2314)', async () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        a: [String!]!
        b: B!
      }

      type B {
        id: ID!
        a: [String!]!
      }
    `,
    resolvers: {
      Query: {
        a() {
          return ['AA', 'BB', 'CC'];
        },
        b() {
          return {};
        },
      },
      B: {
        id() {
          return '1';
        },
        a() {
          return ['AA', 'BB', 'CC'];
        },
      },
    },
  });

  const testInstance = createTestkit([useResponseCache({ session: () => null })], schema);

  const query = /* GraphQL */ `
    query test {
      a
      b {
        id
        a
      }
    }
  `;
  const result = await testInstance.execute(query);
  assertSingleExecutionValue(result);
  expect(result).toEqual({
    data: {
      a: ['AA', 'BB', 'CC'],
      b: {
        a: ['AA', 'BB', 'CC'],
        id: '1',
      },
    },
  });
});

it('correctly remove cache keys from incremental delivery result', async () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        users: [User!]!
      }

      type User {
        id: ID!
        name: String!
      }

      directive @stream on FIELD
    `,
    resolvers: {
      Query: {
        async *users() {
          yield { id: '1', name: 'Alice' };
          await setTimeout(10);
          yield { id: '2', name: 'Bob' };
        },
      },
    },
  });

  const testInstance = createTestkit(
    [
      useEngine({ ...GraphQLJS, execute: normalizedExecutor, subscribe: normalizedExecutor }),
      useResponseCache({ session: () => null }),
    ],
    schema,
  );

  const query = /* GraphQL */ `
    query test {
      users @stream {
        id
        name
      }
    }
  `;
  const result = await testInstance.execute(query);
  assertStreamExecutionValue(result);
  const result1 = (await result.next()).value;
  const result2 = (await result.next()).value;
  const result3 = (await result.next()).value;
  const result4 = (await result.next()).value;

  expect(result1).toEqual({ data: { users: [] }, hasNext: true });
  expect(result2).toEqual({
    incremental: [{ items: [{ id: '1', name: 'Alice' }], path: ['users', 0] }],
    hasNext: true,
  });
  expect(result3).toEqual({
    incremental: [{ items: [{ id: '2', name: 'Bob' }], path: ['users', 1] }],
    hasNext: true,
  });
  expect(result4).toEqual({ hasNext: false });

  const secondResult = await testInstance.execute(query);
  assertSingleExecutionValue(secondResult);
  expect(secondResult).toEqual({
    data: {
      users: [
        { id: '1', name: 'Alice' },
        {
          id: '2',
          name: 'Bob',
        },
      ],
    },
  });
});

it('manipulates the TTL', async () => {
  const schema = makeExecutableSchema({
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
  const expectedFinalTtl = 5000;
  const onTtlOriginal: ResponseCacheOnTtlFunction<unknown> = () => expectedFinalTtl;
  const onTtl = jest.fn(onTtlOriginal);
  const testkit = createTestkit(
    [
      useResponseCache({
        session: () => null,
        ttl: 1000,
        ttlPerSchemaCoordinate: { 'Query.foo': 2000 },
        includeExtensionMetadata: true,
        onTtl,
      }),
    ],
    schema,
  );

  const operation = /* GraphQL */ `
    query {
      foo
    }
  `;

  const context = {};

  const result = await testkit.execute(operation, {}, context);
  expect(result).toEqual({
    data: {
      foo: 'bar',
    },
    extensions: {
      responseCache: {
        didCache: true,
        hit: false,
        ttl: expectedFinalTtl,
      },
    },
  });
  expect(onTtl).toHaveBeenCalledWith({
    ttl: 2000,
    context,
  });
});

it('handles DateTime scalar', async () => {
  let fooTime: Date | undefined;
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      scalar DateTime

      type Query {
        foo: DateTime
      }
    `,
    resolvers: {
      Query: {
        foo: () => (fooTime ||= new Date()),
      },
      DateTime: DateTimeResolver,
    },
  });
  const testkit = createTestkit([useResponseCache({ session: () => null })], schema);

  const operation = /* GraphQL */ `
    query {
      foo
    }
  `;

  async function checkResult() {
    const result = await testkit.execute(operation);
    assertSingleExecutionValue(result);
    expect(result).toEqual({
      data: {
        foo: fooTime,
      },
    });
  }

  await checkResult();
  await checkResult();
});
