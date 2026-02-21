import { useMemo } from 'react';
import { StaticImageData } from 'next/image';
import { compareDesc } from 'date-fns';
import { useData } from 'nextra/hooks';
import { fetchPackageInfoCachedAndRetried } from '@/lib/fetch-package-info-cached-and-retried';
import { ALL_TAGS, PLUGINS } from '@/lib/plugins';
import { cn, MarketplaceSearch } from '@theguild/components';

type Plugin = {
  title: string;
  readme: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  linkHref: string;
  weeklyNPMDownloads: number;
  icon: StaticImageData;
  tags: string[];
  className?: string;
};

export const getStaticProps = async () => {
  const plugins: Plugin[] = await Promise.all(
    PLUGINS.map(
      async ({ identifier, npmPackage, title, icon, tags, githubReadme, className = '' }) => {
        const {
          readme,
          createdAt,
          updatedAt,
          description,
          weeklyNPMDownloads = 0,
        } = await fetchPackageInfoCachedAndRetried(npmPackage, githubReadme);
        const actualReadme = githubReadme ? 'TODO' : readme;

        return {
          title,
          readme: actualReadme,
          createdAt,
          updatedAt,
          description,
          linkHref: `/plugins/${identifier}`,
          weeklyNPMDownloads,
          icon,
          tags,
          className,
        };
      },
    ),
  ).catch(err => {
    console.error('failed to fetch plugins', err);
    if (process.env.NODE_ENV === 'development') {
      return []; // flakily fails on HMR
    }
    throw err;
  });

  return {
    props: {
      // We add an `ssg` field to the page props,
      // which will be provided to the Nextra's `useSSG` hook.
      ssg: plugins,
    },
  };
};

export function PluginsPage({ className }: { className?: string }) {
  const plugins = useData() as Plugin[];

  const marketplaceItems = useMemo(
    () =>
      plugins.map(plugin => ({
        title: plugin.title,
        description: plugin.description,
        tags: plugin.tags,
        link: {
          href: plugin.linkHref,
          title: `${plugin.title} plugin details`,
        },
        update: plugin.updatedAt,
        image: {
          src: plugin.icon,
          placeholder: 'empty' as const,
          loading: 'eager' as const,
          alt: plugin.title,
          width: 60,
          className: `max-w-[3.75rem] ${plugin.className}`,
        },
        weeklyNPMDownloads: plugin.weeklyNPMDownloads,
      })),
    [plugins],
  );

  const recentlyUpdatedItems = useMemo(
    () => [...marketplaceItems].sort((a, b) => compareDesc(new Date(a.update), new Date(b.update))),
    [marketplaceItems],
  );

  const trendingItems = useMemo(
    () =>
      marketplaceItems
        .filter(i => i.weeklyNPMDownloads)
        .sort((a, b) => {
          const aMonthlyDownloads = a.weeklyNPMDownloads || 0;
          const bMonthlyDownloads = b.weeklyNPMDownloads || 0;

          return bMonthlyDownloads - aMonthlyDownloads;
        }),
    [marketplaceItems],
  );

  return (
    <>
      <MarketplaceSearch
        title="Explore Plugins"
        tagsFilter={ALL_TAGS}
        placeholder="Find plugins..."
        primaryList={{
          title: 'Trending',
          items: trendingItems,
          placeholder: '0 items',
          pagination: 10,
        }}
        secondaryList={{
          title: 'Recently Updated',
          items: recentlyUpdatedItems,
          placeholder: '0 items',
          pagination: 10,
        }}
        queryList={{
          title: 'Search Results',
          items: marketplaceItems,
          placeholder: 'No results for {query}',
          pagination: 10,
        }}
        className={cn(
          className,
          // hacky, but we'd have to update all logos and this
          // makes the current ones look okay
          // - only .png logos have padding, because .svg logos have background & correct inner padding
          '[&_a>div:has(>img[src$=".png"])]:p-2 [&_a_img]:ring-transparent [&_a>div:has(>img)]:ring-[rgb(from_var(--fg)_r_g_b_/_0.1)] [&_a>div:has(>img)]:ring-inset [&_a>div:has(>img)]:ring-1',
        )}
      />
      <style href="envelop-plugin-logos">
        {
          /* css */ `
          @media (prefers-color-scheme: dark) {
            .MarketplaceSearch img[src*=rate_limiter],
            .MarketplaceSearch img[src*=persisted_operations],
            .MarketplaceSearch img[src*=assets] {
                filter: invert(1);
            }
          }
        `
        }
      </style>
    </>
  );
}
