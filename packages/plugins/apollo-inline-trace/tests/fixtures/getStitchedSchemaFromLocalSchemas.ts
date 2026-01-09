import { GraphQLSchema } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { fakePromise } from '@whatwg-node/server';

export async function getStitchedSchemaFromLocalSchemas(
  localSchemas: Record<string, GraphQLSchema>,
): Promise<GraphQLSchema> {
  // dynamic import is used only due to incompatibility with graphql@15
  const { IntrospectAndCompose, LocalGraphQLDataSource } = await import('@apollo/gateway');
  const introspectAndCompose = await new IntrospectAndCompose({
    subgraphs: Object.keys(localSchemas).map(name => ({ name, url: `http://localhost/${name}` })),
  }).initialize({
    healthCheck: () => fakePromise<void>(undefined),
    update: () => undefined,
    getDataSource: ({ name }) => {
      const [_name, schema] = Object.entries(localSchemas).find(([key]) => key === name) ?? [];
      if (schema) {
        return new LocalGraphQLDataSource(schema);
      }
      throw new Error(`Unknown subgraph ${name}`);
    },
  });

  return getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: introspectAndCompose.supergraphSdl,
    onSubschemaConfig: cofig => {
      const [_name, schema] =
        Object.entries(localSchemas).find(([key]) => key === cofig.name.toLowerCase()) ?? [];
      if (schema) {
        cofig.executor = createDefaultExecutor(schema);
      } else {
        throw new Error(`Unknown subgraph ${cofig.name}`);
      }
    },
  });
}
