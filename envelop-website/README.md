# Envelop docs

The documentation at [the-guild.dev/graphql/envelop](https://the-guild.dev/graphql/envelop) is
authored here and rendered by [the-guild-org/website](https://github.com/the-guild-org/website),
which fetches this folder at build time. Nothing in this folder is built or deployed on its own.

## Layout

| Path                     | What it is                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/docs/`          | The documentation of the current major (v4). Folder order and titles come from each folder's `meta.json`.                                                      |
| `content/v2/`, `v3/`     | The docs of the older majors, frozen as they were when each was current. The site shows them under `/v2` and `/v3` with an "old version" banner.               |
| `plugins.json`           | The Plugin Hub registry: every plugin's title, npm package, icon, tags, and where its readme lives. Plugin pages are rendered from those readmes at build time. |
| `assets/`                | Images referenced from pages as `/assets/...`, the plugin icons under `assets/logos/`, and the logo.                                                            |

## Writing pages

- Frontmatter: `title` (required) and `description`. The site renders the title as the page
  heading, so pages do not start with an `# H1`. Use `sidebarTitle` when the sidebar should show a
  shorter label.
- Ordering: each folder's `meta.json` lists `pages` in display order; a folder's `title` is its
  sidebar label. Pages not listed are built but hidden from the sidebar.
- Components available without importing: `Callout`, `Tabs` / `Tabs.Tab`, `Cards`, `FileTree`. Name
  code blocks with ` ```ts title="server.ts" `, and use ` ```sh npm2yarn ` for install commands.
- Links between pages are root-relative to this product: `/docs/plugins/lifecycle`,
  `/plugins/use-sentry`.

## Adding a plugin to the Plugin Hub

Add an entry to `plugins.json` keyed by the page slug (`/plugins/<key>`): `title`, `npmPackage`,
`icon` (a file under `assets/`), `tags` (from the `tags` list at the top of the file), and
`readme` (`repo` and `path` of the markdown to render). Readmes in this repository are read from
the checkout; readmes in other repositories are fetched from GitHub at build time.

## Previewing changes

Every same-repository pull request that touches this folder gets a preview at
`https://yoga-pr-<number>.guild-dev-website.pages.dev/graphql/envelop` (linked in a PR comment
within about ten minutes). Merges to `main` redeploy the live docs automatically.
