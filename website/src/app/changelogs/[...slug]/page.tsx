import fs from 'node:fs/promises';
import type { Metadata } from 'next/types';
import fg from 'fast-glob';
import type { NextPageProps } from '@theguild/components';
import {
  compileMdx,
  convertToPageMap,
  evaluate,
  mergeMetaWithPageMap,
  normalizePageMap,
} from '@theguild/components/server';
import { defaultNextraOptions } from '@theguild/components/server/next.config';
import { useMDXComponents } from '../../../mdx-components';

async function getPackages() {
  const result = await fg(['../packages/**/package.json'], {
    ignore: ['../**/node_modules/**', '../**/dist/**'],
  });
  return result.map(r =>
    r.split('/').slice(
      // remove ../packages
      2,
      // remove package.json
      -1,
    ),
  );
}

export async function generateStaticParams() {
  const result = await getPackages();
  return result.map(slug => ({ slug }));
}

const { pageMap: _pageMap } = convertToPageMap({
  filePaths: (await getPackages()).map(slug => slug.join('/')),
  basePath: 'changelogs',
});

// @ts-expect-error -- ignore
const changelogsPages = _pageMap[0].children;

const changelogsPageMap = mergeMetaWithPageMap(changelogsPages, {
  // Put Yoga at top
  'graphql-yoga': '',
});

export const pageMap = normalizePageMap(changelogsPageMap);

export async function generateMetadata(props: NextPageProps<'...slug'>): Promise<Metadata> {
  const params = await props.params;
  const { name: packageName } = JSON.parse(
    await fs.readFile(`../packages/${params.slug.join('/')}/package.json`, 'utf8'),
  );
  return {
    title: `Changelog for "${packageName}"`,
    description: `Discover the latest updates, enhancements, and bug fixes for "${packageName}" package`,
  };
}

const { wrapper: Wrapper, ...components } = useMDXComponents();

export default async function Page(props: NextPageProps<'...slug'>) {
  const params = await props.params;
  const filePath = `../packages/${params.slug.join('/')}/CHANGELOG.md`;
  const rawMd = await fs.readFile(filePath, 'utf8');

  const rawJs = await compileMdx(rawMd, {
    filePath,
    ...defaultNextraOptions,
    mdxOptions: defaultNextraOptions.mdxOptions,
  });
  const { default: MDXContent, toc, metadata } = evaluate(rawJs, components);

  return (
    <Wrapper
      toc={toc}
      metadata={{
        ...metadata,
        // Do not index changelogs from search
        searchable: false,
      }}
    >
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
