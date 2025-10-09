import { FC, ReactNode } from 'react';
import localFont from 'next/font/local';
import {
  Anchor,
  GitHubIcon,
  HiveFooter,
  HiveLayoutConfig,
  HiveNavigation,
  ListIcon,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
  YogaIcon,
} from '@theguild/components';
import { getPageMap, HiveLayout } from '@theguild/components/server';
import '@theguild/components/style.css';
import { pageMap as changelogsPageMap } from './changelogs/[...slug]/page';
import { rootMetadata, websiteDescription } from './metadata';
import { pageMap as v2PageMap } from './v2/[[...slug]]/page';
import { pageMap as v3PageMap } from './v3/[[...slug]]/page';
import { pageMap as v4PageMap } from './v4/[[...slug]]/page';
import { VersionDropdown } from './version-dropdown.client';
import { VersionedSearch } from './versioned-search';
import './global.css';

export const metadata = rootMetadata;

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
    // Medium is actually 530, so we use it both for 500 and 600
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '600' },
    { path: '../fonts/PPNeueMontreal-SemiBold.woff2', weight: '700' },
  ],
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
    <HiveLayout
      className="[&>.light_#h-navmenu-container]:max-w-[1392px]"
      fontFamily={neueMontreal.style.fontFamily}
      docsRepositoryBase="https://github.com/graphql-hive/graphql-yoga/tree/main/website"
      head={null}
      lightOnlyPages={['/']}
      navbar={
        <HiveNavigation
          productName={PRODUCTS.YOGA.name}
          logo={
            <Anchor href="/" className="hive-focus -m-2 flex items-center rounded-md p-2 gap-3">
              <YogaIcon className="size-8 shrink-0" />
              <span className="text-2xl font-medium tracking-[-0.16px]">Yoga</span>
            </Anchor>
          }
          navLinks={[{ href: '/tutorial', children: 'Tutorial' }]}
          developerMenu={[
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
              href: '/changelog',
              icon: <ListIcon />,
              children: 'Changelog',
            },
            {
              href: 'https://github.com/graphql-hive/graphql-yoga',
              icon: <GitHubIcon />,
              children: 'GitHub',
            },
          ]}
          search={<VersionedSearch />}
        >
          <VersionDropdown />
        </HiveNavigation>
      }
      footer={
        <HiveFooter
          logo={
            <Anchor href="/" className="hive-focus -m-2 flex items-center rounded-md p-2 gap-3">
              <YogaIcon className="size-8 shrink-0" />
              <span className="text-2xl font-medium tracking-[-0.16px]">Yoga</span>
            </Anchor>
          }
          description={websiteDescription}
        />
      }
    >
      {children}
    </HiveLayout>
  );
};

export default RootLayout;
