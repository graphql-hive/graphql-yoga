import { notFound } from 'next/navigation';
import type { NextPageProps } from '@theguild/components';
import { Callout, Tabs } from '@theguild/components';
import { defaultNextraOptions } from '@theguild/components/next.config';
import {
  compileMdx,
  convertToPageMap,
  evaluate,
  remarkLinkRewrite,
} from '@theguild/components/server';
import json from '../../../../remote-files/v4.json';
import { useMDXComponents } from '../../../mdx-components';
import CodegenCallout from '../../codegen-callout.mdx';
import { Giscus } from '../../giscus';
import LegacyDocsBanner from '../../legacy-docs-banner.mdx';
import { buildVersionedNav, type VersionedNavMeta } from '../../versioned-nav';
import { VersionedSidebar } from '../../versioned-sidebar';

const { branch, docsPath, filePaths, repo, user } = json;

const VERSION = 4;

const { mdxPages } = convertToPageMap({ filePaths, basePath: `v${VERSION}` });

const navMeta: VersionedNavMeta = {
  index: 'Quick Start',
  features: {
    items: {
      schema: 'GraphQL Schema',
      graphiql: 'GraphiQL',
      context: 'GraphQL Context',
      'error-masking': '',
      introspection: '',
      subscriptions: '',
      'file-uploads': '',
      'defer-stream': 'Defer and Stream',
      'request-batching': '',
      cors: '',
      'csrf-prevention': 'CSRF Prevention',
      'parsing-and-validation-caching': '',
      'response-caching': '',
      'persisted-operations': '',
      'automatic-persisted-queries': '',
      'logging-and-debugging': '',
      'health-check': '',
      'sofa-api': 'REST API',
      cookies: '',
      'apollo-federation': '',
      'envelop-plugins': 'Plugins',
      testing: '',
      jwt: '',
    },
  },
  integrations: {
    items: {
      'integration-with-aws-lambda': 'AWS Lambda',
      'integration-with-cloudflare-workers': 'Cloudflare Workers',
      'integration-with-gcp': 'Google Cloud Platform',
      'integration-with-deno': 'Deno',
      'integration-with-express': 'Express',
      'integration-with-fastify': 'Fastify',
      'integration-with-koa': 'Koa',
      'integration-with-nestjs': 'NestJS',
      'integration-with-nextjs': 'Next.js',
      'integration-with-sveltekit': 'SvelteKit',
      'integration-with-hapi': 'Hapi',
      'integration-with-bun': 'Bun',
      'integration-with-uwebsockets': 'µWebSockets.js',
      'z-other-environments': 'Other Environments',
    },
  },
  migration: {
    items: {
      'migration-from-apollo-server': 'Apollo Server',
      'migration-from-express-graphql': 'Express GraphQL',
      'migration-from-yoga-v1': 'Yoga v1',
      'migration-from-yoga-v2': 'Yoga v2',
      'migration-from-yoga-v3': 'Yoga v3',
    },
  },
};

const navItems = buildVersionedNav(filePaths, VERSION, navMeta);

const { wrapper: Wrapper, ...components } = useMDXComponents({
  $Tabs: Tabs,
  Callout,
  CodegenCallout,
  Tab: Tabs.Tab,
  Tabs,
});

async function getPageContent(filePath: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${docsPath}${filePath}`,
  );
  const data = await response.text();
  const rawJs = await compileMdx(data, {
    filePath,
    ...defaultNextraOptions,
    mdxOptions: {
      ...defaultNextraOptions.mdxOptions,
      remarkPlugins: [
        [remarkLinkRewrite, { pattern: /^\/docs(\/.*)?$/, replace: `/v${VERSION}$1` }],
      ],
    },
  });
  return evaluate(rawJs, components);
}

export async function generateMetadata(props: NextPageProps<'...slug'>) {
  const params = await props.params;
  const route = (params.slug || []).join('/');
  const filePath = mdxPages[route];
  if (!filePath) return {};
  const { metadata } = await getPageContent(filePath);
  return { ...metadata, title: `[Old v${VERSION} docs] ${metadata.title || 'Yoga'}` };
}

export default async function Page(props: NextPageProps<'...slug'>) {
  const params = await props.params;
  const route = (params.slug || []).join('/');
  const filePath = mdxPages[route];

  if (!filePath) {
    notFound();
  }
  const { default: MDXContent, toc, metadata } = await getPageContent(filePath);

  return (
    <div
      className="mx-auto flex w-full flex-col gap-6 md:flex-row md:items-start md:gap-x-8"
      data-version={`v${VERSION}`}
      // https://pagefind.app/docs/filtering/#capturing-a-filter-value-from-an-attribute
      data-pagefind-filter="version[data-version]"
    >
      <VersionedSidebar items={navItems} />
      <div className="min-w-0 flex-1">
        <Wrapper toc={toc} metadata={metadata} bottomContent={<Giscus />}>
          <LegacyDocsBanner yogaVersion={VERSION} />
          <MDXContent />
        </Wrapper>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  const params = Object.keys(mdxPages).map(route => ({
    slug: route.split('/'),
  }));
  return params;
}
