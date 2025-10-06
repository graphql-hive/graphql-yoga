import { withGuildDocs } from '@theguild/components/next.config';

const config = withGuildDocs({
  redirects: async () =>
    Object.entries({
      '/docs/quick-start': '/docs',
      '/tutorial': '/tutorial/basic',
      '/tutorial/basic/00-introduction': '/tutorial/basic',
      '/docs/testing': '/docs/features/testing',
      '/docs/integrations': '/docs',
      '/docs/features': '/docs',
      '/v2/features/health-check': '/v2',
      '/v2/features/defer-stream': '/v2',
      '/v2/features/automatic-persisted-queries': '/v2',
      '/v2/features/response-caching': '/v2',
      '/v2/features/introspection': '/v2',
      '/v2/features/persisted-operations': '/v2',
      '/features/graphiql': '/docs/features/graphiql',
      '/examples/graphql-ws': '/docs/features/subscriptions',
      '/changelog': '/changelogs/graphql-yoga',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    SITE_URL: 'https://the-guild.dev/graphql/yoga-server',
  },
  output: 'export',
});

if (config.experimental?.turbo) {
  // TODO: Migrate this in @theguild/components
  config.turbopack = config.experimental!.turbo;
  delete config.experimental!.turbo;
}

export default config;
