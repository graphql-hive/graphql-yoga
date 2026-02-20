import { withGuildDocs } from '@theguild/components/next.config';

export default {
  ...withGuildDocs({
    output: 'export',
    experimental: {
      urlImports: ['https://the-guild.dev/static/shared-logos/products/hive.svg'],
    },
    redirects: () =>
      Object.entries({
        '/docs/securing-your-graphql-api': '/docs/guides/securing-your-graphql-api',
        '/docs/adding-authentication-with-auth0': '/docs/guides/adding-authentication-with-auth0',
        '/docs/monitoring-and-tracing': '/docs/guides/monitoring-and-tracing',
        '/docs/using-graphql-features-from-the-future':
          '/docs/guides/using-graphql-features-from-the-future',
        '/docs/resolving-subscription-data-loader-caching-issues':
          '/docs/guides/resolving-subscription-data-loader-caching-issues',
        '/docs/adding-a-graphql-response-cache': '/docs/guides/adding-a-graphql-response-cache',
        '/plugins/use-depth-limit': '/plugins/graphql-armor-max-depth',
        '/docs/introduction': '/docs',
        '/docs/plugins/introduction': '/docs/plugins',
        '/plugins/use-async-schema':
          '/docs/guides/migrating-from-v2-to-v3#3-remove-useasyncschema-plugin',
        '/plugins/use-timing': '/docs/guides/migrating-from-v2-to-v3#2-drop-usetiming-plugin',
        '/docs/guides/migrating-from-v2-to-v3': '/v3/guides/migrating-from-v2-to-v3',
        '/plugins/use-lazy-loaded-schema':
          '/docs/guides/migrating-from-v2-to-v3#4-rename-uselazyloadedschema-to-useschemabycontext',
      }).map(([from, to]) => ({
        source: from,
        destination: to,
        permanent: true,
      })),
  }),
};
