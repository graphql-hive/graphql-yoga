# Welcome

> [!IMPORTANT]
>
> This guide extends the
> [core Guild contributing guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md).
> If you haven't read it yet or recently (e.g. past year), please read it first.

## Setup

1. Use corepack: `corepack enable`
2. Install packages: `pnpm install`
3. Build packages: `pnpm build`

## Tests

### Integration

- Can only be run after [packages have been built](#setup).

### GraphQL versions

Every supported `graphql-js` major is installed side by side through npm aliases in the root
`package.json` (`graphql-15`, `graphql-16`, next to the primary `graphql` dependency), so a single
`pnpm install` is enough to test against all of them. Jest creates one project per version and
redirects every `graphql` import to the selected copy at runtime, so switching versions never
requires re-installing the workspace.

By default all installed versions run:

```sh
pnpm test:unit
```

Pick a single version, either with the `GRAPHQL_VERSION` environment variable (a comma separated
list of majors, or `all`) or with Jest's project selection:

```sh
GRAPHQL_VERSION=16 pnpm test:unit
pnpm test:unit --selectProjects graphql-16
```

To add or drop a supported version, change the aliases in the root `package.json`; the Jest projects
are derived from them (see `scripts/graphql-versions.js`).

> [!NOTE]
>
> The redirect is a Jest `moduleNameMapper`, so it only covers modules loaded by Jest itself. The
> few example integration tests that boot their server in a child process (`egg`, `nextjs-app`,
> `nextjs-legacy-pages`, `sveltekit`, `bun-pothos`) always run against the primary `graphql`
> dependency, whatever `GRAPHQL_VERSION` is set to.
