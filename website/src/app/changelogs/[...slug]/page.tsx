import fs from 'node:fs/promises';
import fg from 'fast-glob';
import { visitParents } from 'unist-util-visit-parents';
import { NextPageProps } from '@theguild/components';
import {Mermaid} from '@theguild/remark-mermaid/mermaid'
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

export async function generateMetadata(props: NextPageProps<'...slug'>) {
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

const remarkRemoveUpdatedDependency = () => (ast: any) => {
  visitParents(ast, 'text', (node, ancestors) => {
    if (
      node.value.startsWith('Updated dependencies') ||
      node.value.startsWith('Updated dependency')
    ) {
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (ancestors[i].type === 'list') {
          ancestors[i].children = [];
          break;
        }
      }
    }
  });
};

export default async function Page(props: NextPageProps<'...slug'>) {
  const params = await props.params;
  const filePath = `../packages/${params.slug.join('/')}/CHANGELOG.md`;
  const rawMd = await fs.readFile(filePath, 'utf8');

  const rawJs = await compileMdx(rawMd, {
    filePath,
    ...defaultNextraOptions,
    mdxOptions: {
      ...defaultNextraOptions.mdxOptions,
      // remarkPlugins: [remarkRemoveUpdatedDependency],
    },
  });
  const { default: MDXContent, toc, metadata } = evaluate(rawJs, {...components, Mermaid});

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
