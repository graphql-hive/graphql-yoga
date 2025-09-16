'use client';

import { usePathname } from 'next/navigation';
import { Search } from '@theguild/components';

export const VERSIONS = new Set(['v2', 'v3', 'v4']);

const DEFAULT_FILTERS = {
  filters: {
    version: {
      none: [...VERSIONS],
    },
  },
};

export function VersionedSearch() {
  const pathname = usePathname().slice(1);
  const opts = VERSIONS.has(pathname)
    ? { filters: { version: pathname } }
    : //
      DEFAULT_FILTERS;
  return <Search searchOptions={opts} />;
}
