import { useExtendContext } from '@envelop/core';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { usePreloadAssets } from '../src/index.js';

describe('usePreloadAssets', () => {
  const imageUrl = 'https://localhost/some-asset.png';
  const schema = makeExecutableSchema({
    typeDefs: `type Query { imageUrl: String! noAsset: String! }`,
    resolvers: {
      Query: {
        imageUrl: (_: unknown, __: unknown, context: any) => {
          context.registerPreloadAsset(imageUrl);
          return Promise.resolve(imageUrl);
        },
        noAsset: () => Promise.resolve('hi'),
      },
    },
  });

  it('Should include assets to preload', async () => {
    const testInstance = createTestkit([usePreloadAssets()], schema);
    const result = await testInstance.execute(`query { imageUrl }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      preloadAssets: ['https://localhost/some-asset.png'],
    });
  });

  it('Should not include the preload extension if no asset should be preloaded', async () => {
    const testInstance = createTestkit([usePreloadAssets()], schema);
    const result = await testInstance.execute(`query { noAsset }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toBeUndefined();
  });

  it('Should not include preload extension if asset preloading is disabled via shouldPreloadAssets', async () => {
    const testInstance = createTestkit(
      [
        useExtendContext(() => ({ shouldPreloadAssets: false })),
        usePreloadAssets({ shouldPreloadAssets: context => (context as any).shouldPreloadAssets }),
      ],
      schema,
    );
    const result = await testInstance.execute(`query { imageUrl }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toBeUndefined();
  });
});
