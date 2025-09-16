import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import config from '../next.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sitemapPath = path.join(__dirname, '..', 'out', 'sitemap.xml');
const lockfilePath = path.join(__dirname, '..', 'route-lockfile.txt');

async function main() {
  const parser = new XMLParser();

  const d = parser.parse(fs.readFileSync(sitemapPath, 'utf8'));

  const routes = d.urlset.url.map((url: { loc: string }) =>
    url.loc.replace(process.env.SITE_URL || 'https://graphql-yoga.com', ''),
  );

  const redirectsPointingToNonExistingStuff = [];

  const redirects = await config.redirects!();

  for (const redirect of redirects) {
    if (routes.includes(redirect.destination) === false) {
      redirectsPointingToNonExistingStuff.push(redirect);
    }
    routes.push(`${redirect.source} -> ${redirect.destination}`);
  }

  if (redirectsPointingToNonExistingStuff.length) {
    // eslint-disable-next-line no-console
    console.error(
      `The following routes do not point to a route:\n\n` +
        redirectsPointingToNonExistingStuff.map(
          redirect => `- "${redirect.source}" -> "${redirect.destination}"`,
        ) +
        `\n`,
    );
    throw new Error('Redirect pointing to nothing.');
  }

  fs.writeFileSync(lockfilePath, routes.sort().join(`\n`) + `\n`);
}

main();
