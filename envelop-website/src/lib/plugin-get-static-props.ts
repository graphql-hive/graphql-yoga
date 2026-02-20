import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { buildDynamicMDX, buildDynamicMeta } from 'nextra/remote';
import { fetchPackageInfo } from '@theguild/components';
import { fetchPackageInfoCachedAndRetried } from './fetch-package-info-cached-and-retried';
import { PLUGINS } from './plugins';

export const getStaticPaths: GetStaticPaths = () => ({
  paths: PLUGINS.map(({ identifier }) => ({
    params: { name: identifier },
  })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ctx => {
  const pluginPath = ctx.params?.name;
  const plugin = PLUGINS.find(v => v.identifier === pluginPath);

  if (!plugin) {
    throw new Error(`Unknown "${pluginPath}" plugin identifier`);
  }
  const { npmPackage, githubReadme, title } = plugin;
  const { readme, updatedAt } = await fetchPackageInfoCachedAndRetried(npmPackage, githubReadme);

  const mdx = await buildDynamicMDX(
    `
# \`${title}\`

|Package name|Weekly Downloads|Version|License|Updated|
|-|-|-|-|-|
|[\`${npmPackage}\`](https://npmjs.com/package/${npmPackage})|![Downloads](https://badgen.net/npm/dw/${npmPackage} "Downloads")|![Version](https://badgen.net/npm/v/${npmPackage} "Version")|![License](https://badgen.net/npm/license/${npmPackage} "License")|${format(
      new Date(updatedAt),
      'MMM do, yyyy',
    )}|

${readme}`,
    { defaultShowCopyCode: true },
  );

  return {
    props: {
      ...mdx,
      ...(await buildDynamicMeta()),
    },
  };
};
