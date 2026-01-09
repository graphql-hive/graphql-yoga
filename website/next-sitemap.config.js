/* eslint-env node */

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.SITE_URL || 'https://graphql-yoga.com',
  generateIndexSitemap: false,
  output: 'export',
};
