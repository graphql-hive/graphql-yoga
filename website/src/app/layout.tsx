import { FC, ReactNode } from 'react';
import { GitHubIcon, PaperIcon, PencilIcon, PRODUCTS } from '@theguild/components';
import { getDefaultMetadata, getPageMap, GuildLayout } from '@theguild/components/server';
import '@theguild/components/style.css';
import { pageMap as changelogsPageMap } from './changelogs/[...slug]/page';
import { pageMap as v2PageMap } from './v2/[[...slug]]/page';
import { pageMap as v3PageMap } from './v3/[[...slug]]/page';
import { pageMap as v4PageMap } from './v4/[[...slug]]/page';
import { VersionDropdown } from './version-dropdown.client';
import { VersionedSearch } from './versioned-search';

const description = PRODUCTS.YOGA.title;
const websiteName = 'Yoga';

export const metadata = getDefaultMetadata({
  description,
  websiteName,
  productName: 'YOGA',
});

const RootLayout: FC<{
  children: ReactNode;
}> = async ({ children }) => {
  let [meta, ...pageMap] = await getPageMap();
  pageMap = [
    {
      data: {
        // @ts-expect-error -- ignore
        ...meta.data,
        changelogs: { type: 'page', title: 'Changelogs', theme: { layout: 'full' } },
        v2: { type: 'page', title: 'Yoga 2 Docs' },
        v3: { type: 'page', title: 'Yoga 3 Docs' },
        v4: { type: 'page', title: 'Yoga 4 Docs' },
      },
    },
    ...pageMap,
    { route: '/changelogs', name: 'changelogs', children: changelogsPageMap },
    { route: '/v4', name: 'v4', children: v4PageMap },
    { route: '/v3', name: 'v3', children: v3PageMap },
    { route: '/v2', name: 'v2', children: v2PageMap },
  ];
  return (
    <GuildLayout
      htmlProps={{
        // Override nav width
        className: '[&>.light_#h-navmenu-container]:max-w-[1392px]',
      }}
      websiteName={websiteName}
      description={description}
      logo={<PRODUCTS.YOGA.logo className="w-8 h-auto" />}
      layoutProps={{
        docsRepositoryBase: 'https://github.com/graphql-hive/graphql-yoga/tree/main/website',
      }}
      pageMap={pageMap}
      navbarProps={{
        navLinks: [{ href: '/tutorial', children: 'Tutorial' }],
        developerMenu: [
          {
            href: '/docs',
            icon: <PaperIcon />,
            children: 'Documentation',
          },
          {
            href: 'https://the-guild.dev/graphql/hive/blog',
            icon: <PencilIcon />,
            children: 'Blog',
          },
          {
            href: 'https://github.com/graphql-hive/graphql-yoga',
            icon: <GitHubIcon />,
            children: 'GitHub',
          },
          {
            href: '/changelog',
            icon: null,
            children: 'Changelog',
          },
        ],
        children: <VersionDropdown />,
      }}
      search={<VersionedSearch />}
      lightOnlyPages={['/']}
    >
      {children}
    </GuildLayout>
  );
};

export default RootLayout;
