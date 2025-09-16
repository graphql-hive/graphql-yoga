import type { UserConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { join } from 'node:path';
const config: UserConfig = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			tslib: 'tslib/tslib.es6.js',
			'@whatwg-node/fetch': join(__dirname, 'ponyfill.js'),
			'@whatwg-node/events': join(__dirname, 'ponyfill.js')
		}
	}
};

export default config;
