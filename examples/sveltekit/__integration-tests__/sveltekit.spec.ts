import { execSync, spawn } from 'node:child_process';
import { Browser, chromium, Page } from 'playwright';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { fetch } from '@whatwg-node/fetch';

let browser: Browser;
let page: Page;
let sveltekitProcess: ReturnType<typeof spawn>;

const timings = {
	setup: {
		waitAfterPreview: 5000,
		total: 20_000 // build + preview + {waitAfterPreview} is expected to be less than 20sec
	},
	waitForSelector: 999,
	waitForResponse: 1999
};
const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
describeIf(process.versions.node.startsWith('2'))('SvelteKit integration', () => {
	beforeAll(async () => {
		// Kill the port if it's used!
		try {
			execSync('fuser -k 3007/tcp');
			// eslint-disable-next-line no-empty
		} catch (error) {}

		// Build svelteKit
		execSync('yarn workspace example-sveltekit build');

		// Start sveltekit
		sveltekitProcess = spawn('yarn', ['workspace', 'example-sveltekit', 'preview']);

		// Wait for sveltekit to start
		await setTimeout$(timings.setup.waitAfterPreview);

		browser = await chromium.launch({
			headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
			args: ['--incognito', '--no-sandbox', '--disable-setuid-sandbox']
		});

		// How long it took?
	}, timings.setup.total);

	beforeEach(async () => {
		if (page !== undefined) {
			await page.close();
		}
		const context = await browser.newContext();
		page = await context.newPage();
	});

	afterAll(async () => {
		await browser?.close();
		sveltekitProcess.kill();
	});

	it('index page is showing h1', async () => {
		await page.goto('http://localhost:3007/');
		return expect(
			page
				.waitForSelector('h1', { timeout: timings.waitForSelector })
				.then((el) => el?.evaluate((el) => el.textContent))
		).resolves.toBe('Welcome to SvelteKit - GraphQL Yoga');
	});

	it('GraphQL request', () => {
		return expect(
			fetch('http://localhost:3007/api/graphql?query=query+Hello+%7B%0A%09hello%0A%7D').then(
				(res) => res.json()
			)
		).resolves.toEqual({ data: { hello: 'SvelteKit - GraphQL Yoga' } });
	});
});
