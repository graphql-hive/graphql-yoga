/* eslint-disable react-hooks/rules-of-hooks */

/* eslint sort-keys: error */
import { useRouter } from 'next/router';
import { PLUGINS } from '@/lib/plugins';
import { defineConfig, Giscus, PRODUCTS, useTheme } from '@theguild/components';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/graphql-hive/graphql-yoga/tree/main/envelop-website',
  main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const comments = route !== '/' && (
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="graphql-hive/graphql-yoga"
        repoId="MDEwOlJlcG9zaXRvcnkzMzk2NzQ1NjU="
        category="Docs Discussions"
        categoryId="DIC_kwDOFD8Fxc4CSDSX"
        mapping="pathname"
        theme={resolvedTheme}
      />
    );
    return (
      <>
        {children}
        {comments}
      </>
    );
  },
  websiteName: 'Envelop',
  description: 'The GraphQL plugin system',
  logo: <></>, // Envelop has a lettermark of boxed "E", not an icon
  editLink: {
    component({ children, className, filePath }) {
      const router = useRouter();

      let url = `graphql-hive/graphql-yoga/tree/main/envelop-website/${filePath}`;

      if (router.route === '/plugins/[name]') {
        const { name } = router.query;
        const plugin = PLUGINS.find(p => p.identifier === name);
        if (!plugin) {
          return null;
        }
        const { repo, path } = plugin.githubReadme;
        url = `${repo}/tree/main/${path}`;
      }

      return (
        <a
          className={className}
          target="_blank"
          rel="noreferrer"
          href={`https://github.com/${url}`}
        >
          {children}
        </a>
      );
    },
  },
});
