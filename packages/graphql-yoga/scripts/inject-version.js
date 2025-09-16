import { promises as fs } from 'node:fs';
import { globby } from 'globby';
import packageJson from '../package.json' with { type: 'json' };

const files = await globby(['dist/**/*.js']);

const yogaVersion = packageJson.version;

for (const file of files) {
  const content = await fs.readFile(file, 'utf-8');
  await fs.writeFile(file, content.replace(/__YOGA_VERSION__/g, yogaVersion));
}
