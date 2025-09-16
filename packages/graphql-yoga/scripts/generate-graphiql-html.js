import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyT } from 'html-minifier-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TODO review if this function is still needed.
// The types suggest that minifyT is already returning a string.
// And toString does not accept an argument.
/**
 * @param {string} str
 */
async function minify(str) {
  return (
    (
      await minifyT(str, {
        minifyJS: true,
        useShortDoctype: false,
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        minifyCSS: true,
      })
    )
      // @ts-expect-error
      .toString('utf-8')
  );
}

async function minifyGraphiQLHTML() {
  const graphiqlVersion = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'graphiql', 'package.json'), 'utf-8'),
  ).version;

  const minified = await minify(
    fs
      .readFileSync(path.join(__dirname, '..', 'src', 'graphiql.html'), 'utf-8')
      .replace(/__GRAPHIQL_VERSION__/g, graphiqlVersion),
  );

  fs.writeFileSync(
    path.join(__dirname, '../src/graphiql-html.ts'),
    `export default ${JSON.stringify(minified)}`,
  );
}

async function minifyLandingPageHTML() {
  const minified = await minify(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'landing-page.html'), 'utf-8'),
  );

  await fs.promises.writeFile(
    path.join(__dirname, '../src/landing-page-html.ts'),
    `export default ${JSON.stringify(minified)}`,
  );
}

async function main() {
  await Promise.all([minifyGraphiQLHTML(), minifyLandingPageHTML()]);
}

main();
