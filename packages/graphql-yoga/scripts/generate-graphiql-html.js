import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyT } from 'html-minifier-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} str
 */
async function minify(str) {
  return await minifyT(str, {
    minifyJS: true,
    useShortDoctype: false,
    removeAttributeQuotes: true,
    collapseWhitespace: true,
    minifyCSS: true,
  });
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
  console.log('  ✓ GraphiQL HTML minified and saved to graphiql-html.ts');
}

async function minifyLandingPageHTML() {
  const minified = await minify(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'landing-page.html'), 'utf-8'),
  );

  await fs.promises.writeFile(
    path.join(__dirname, '../src/landing-page-html.ts'),
    `export default ${JSON.stringify(minified)}`,
  );
  console.log('  ✓ Landing page HTML minified and saved to landing-page-html.ts');
}

async function main() {
  console.log('\n📝 Generating GraphiQL HTML...');
  await Promise.all([minifyGraphiQLHTML(), minifyLandingPageHTML()]);
  console.log('✅ GraphiQL HTML generation completed successfully.\n');
}

main().catch((error) => {
  console.error('\n❌ Error during GraphiQL HTML generation:', error);
  process.exit(1);
});
