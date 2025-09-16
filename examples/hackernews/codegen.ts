import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/schema/**/schema.graphql',
  generates: {
    'src/schema': defineConfig({
      resolverGeneration: 'disabled',
      typesPluginsConfig: {
        contextType: '../context#GraphQLContext',
      },
    }),
  },
  hooks: { afterAllFileWrite: ['prettier --write'] },
};
export default config;
