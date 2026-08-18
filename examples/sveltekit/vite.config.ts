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
	},
	ssr: {
		// graphql-js 17 ships a real ESM build with no default export (unlike 16, which had no
		// `exports` map and was always resolved through CJS interop). Some dependencies still do
		// `require('graphql')` internally; leaving `graphql` external makes esbuild emit an unused
		// default-import binding alongside named imports, which fails to link against real ESM.
		// Bundling it instead lets esbuild apply CJS interop correctly.
		noExternal: ['graphql']
	}
};

export default config;
