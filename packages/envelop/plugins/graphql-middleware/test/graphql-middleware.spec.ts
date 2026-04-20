import { GraphQLSchema } from 'graphql';
import { shield } from 'graphql-shield';
import { useResponseCache } from '@envelop/response-cache';
import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useGraphQLMiddleware } from '../src/index.js';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      foo: String
    }
  `,
});

const permissions = shield({});

describe('useGraphQlJit', () => {
  it('does not cause infinite loops', async () => {
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttl: 2000,
          includeExtensionMetadata: true,
        }),
        useGraphQLMiddleware([permissions]),
      ],
      schema,
    );

    await testkit.execute(`{ __typename}`);
  });
});

describe('Applied Transform Marker', () => {
  it('should not re-apply middleware when schema is reconstructed with preserved extensions', () => {
    const noopMiddleware = async (resolve: any, root: any, args: any, context: any, info: any) => {
      return resolve(root, args, context, info);
    };

    const plugin = useGraphQLMiddleware([noopMiddleware]) as any;

    let currentSchema: GraphQLSchema = schema;
    let replaceCount = 0;

    plugin.onSchemaChange({
      schema: currentSchema,
      replaceSchema(newSchema: GraphQLSchema) {
        currentSchema = newSchema;
        replaceCount++;
      },
    });

    expect(replaceCount).toBe(1);
    expect(currentSchema.extensions?.['graphqlMiddleware.appliedTransform']).toBe(true);

    // Simulate what useDeferStream does: reconstruct schema and preserve extensions
    const reconstructed = new GraphQLSchema(currentSchema.toConfig());
    reconstructed.extensions = currentSchema.extensions;

    plugin.onSchemaChange({
      schema: reconstructed,
      replaceSchema() {
        replaceCount++;
      },
    });

    // Should not have re-applied because the marker is preserved
    expect(replaceCount).toBe(1);
  });

  it('should use a string key marker that is visible via Object.keys', () => {
    const noopMiddleware = async (resolve: any, root: any, args: any, context: any, info: any) => {
      return resolve(root, args, context, info);
    };

    const plugin = useGraphQLMiddleware([noopMiddleware]) as any;

    let wrappedSchema: GraphQLSchema = schema;

    plugin.onSchemaChange({
      schema: wrappedSchema,
      replaceSchema(newSchema: GraphQLSchema) {
        wrappedSchema = newSchema;
      },
    });

    // String keys are enumerable (unlike Symbols which are lost through Object.entries)
    const extensionKeys = Object.keys(wrappedSchema.extensions || {});
    expect(extensionKeys).toContain('graphqlMiddleware.appliedTransform');
  });

  it('should not re-apply when used with a schema-reconstructing plugin via createTestkit', async () => {
    const noopMiddleware = async (resolve: any, root: any, args: any, context: any, info: any) => {
      return resolve(root, args, context, info);
    };

    // Simulates what useDeferStream does: reconstruct schema and preserve extensions
    const schemaReconstructingPlugin = {
      onSchemaChange({
        schema,
        replaceSchema,
      }: {
        schema: GraphQLSchema;
        replaceSchema: (s: GraphQLSchema) => void;
      }) {
        if (schema.extensions?.['reconstructed']) {
          return;
        }
        const newSchema = new GraphQLSchema(schema.toConfig());
        newSchema.extensions = { ...schema.extensions, reconstructed: true };
        replaceSchema(newSchema);
      },
    };

    const testkit = createTestkit(
      [useGraphQLMiddleware([noopMiddleware]), schemaReconstructingPlugin],
      schema,
    );

    // Should execute without infinite loops
    const result = await testkit.execute(`{ __typename }`);
    expect(result).toBeDefined();
    expect((result as any).data?.__typename).toBe('Query');
  });
});
