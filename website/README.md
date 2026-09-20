# GraphQL Yoga docs

The documentation at [the-guild.dev/graphql/yoga-server](https://the-guild.dev/graphql/yoga-server)
is authored here and rendered by [the-guild-org/website](https://github.com/the-guild-org/website),
which fetches this folder at build time. Nothing in this folder is built or deployed on its own.

## Layout

| Path                     | What it is                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/docs/`          | The Documentation section for the current major. Folder order and titles come from each folder's `meta.json`.                                        |
| `content/tutorial/`      | The Tutorial section.                                                                                                                                 |
| `content/v2/`, `v3/`, `v4/` | The docs of the older majors, frozen as they were when each was current. The site shows them under `/v2`, `/v3` and `/v4` with an "old version" banner. |
| `content/partials/`      | MDX fragments imported by several pages.                                                                                                              |
| `assets/`                | Images referenced from pages as `/assets/...`, the logo, and the social cover image.                                                                  |

Changelog pages (`/changelogs/<package path>`) are rendered from every package's `CHANGELOG.md`
under `packages/`; nothing to maintain here.

## Writing pages

- Frontmatter: `title` (required) and `description`. The site renders the title as the page
  heading, so pages do not start with an `# H1`. Use `sidebarTitle` when the sidebar should show a
  shorter label.
- Ordering: each folder's `meta.json` lists `pages` in display order; a folder's `title` is its
  sidebar label. Pages not listed are built but hidden from the sidebar.
- Components available without importing: `Callout`, `Tabs` / `Tabs.Tab`, `Cards`, `FileTree`. Name
  code blocks with ` ```ts title="server.ts" `, and use ` ```sh npm2yarn ` for install commands.
- Links between pages are root-relative to this product: `/docs/features/cors`.

## Previewing changes

Every pull request that touches this folder gets a preview at
`https://yoga-pr-<number>.guild-dev-website.pages.dev/graphql/yoga-server` (linked in a PR
comment within about ten minutes). Merges to `main` redeploy the live docs automatically.
