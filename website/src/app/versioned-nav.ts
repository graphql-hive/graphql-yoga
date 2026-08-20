// `HiveLayout` builds its sidebar from Nextra's own file-system page map, which has no
// knowledge of the /v2, /v3 and /v4 routes below: their page trees are assembled at
// request time from a remote GitHub tag (see `remote-files/*.json`), so Nextra never sees
// them and renders an empty sidebar for these routes. This builds an equivalent nav tree
// directly from the same file list + title overrides each versioned page already defines,
// so `<VersionedSidebar>` can render it standalone.

export type VersionedNavMeta = Record<string, string | { items?: Record<string, string> }>;

export interface VersionedNavLink {
  title: string;
  route: string;
}

export interface VersionedNavGroup {
  title: string;
  children: VersionedNavLink[];
}

export type VersionedNavItem = VersionedNavLink | VersionedNavGroup;

const ACRONYMS = new Set(['cors', 'jwt']);
const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
]);

function titleize(name: string): string {
  const words = name.split('-');
  return words
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function buildVersionedNav(
  filePaths: string[],
  version: number,
  meta: VersionedNavMeta,
): VersionedNavItem[] {
  const base = `/v${version}`;
  const topLevel: VersionedNavLink[] = [];
  const groups = new Map<string, VersionedNavLink[]>();

  for (const filePath of filePaths) {
    const withoutExt = filePath.replace(/\.mdx?$/, '');
    const slashIndex = withoutExt.indexOf('/');

    if (slashIndex === -1) {
      if (withoutExt === 'index') continue;
      const override = meta[withoutExt];
      topLevel.push({
        title: (typeof override === 'string' && override) || titleize(withoutExt),
        route: `${base}/${withoutExt}`,
      });
      continue;
    }

    const folder = withoutExt.slice(0, slashIndex);
    const file = withoutExt.slice(slashIndex + 1);
    const folderMeta = meta[folder];
    const itemsMeta = (typeof folderMeta === 'object' && folderMeta.items) || {};
    const children = groups.get(folder) ?? [];
    children.push({
      title: itemsMeta[file] || titleize(file),
      route: `${base}/${folder}/${file}`,
    });
    groups.set(folder, children);
  }

  const indexOverride = meta.index;
  const nav: VersionedNavItem[] = [
    { title: (typeof indexOverride === 'string' && indexOverride) || 'Quick Start', route: base },
    ...topLevel,
  ];

  for (const [folder, children] of groups) {
    const folderMeta = meta[folder];
    nav.push({
      title: (typeof folderMeta === 'string' && folderMeta) || titleize(folder),
      children,
    });
  }

  return nav;
}
