'use client';

import { FC } from 'react';
import { usePathname } from 'next/navigation';
import { VersionDropdown as VD } from '@theguild/components';
import { VERSIONS } from './versioned-search';

const ALLOWED_VERSION = new Set([...VERSIONS, 'v5']);

export const VersionDropdown: FC = () => {
  let segment = usePathname().split('/', 2)[1];
  if (segment === 'docs') segment = 'v5';
  return (
    <VD
      currentVersion={ALLOWED_VERSION.has(segment) ? segment : 'v5'}
      chevronPosition="right"
      versions={[
        { label: 'Yoga 5 Docs (latest)', href: '/docs', value: 'v5' },
        { label: 'Yoga 4 Docs', href: '/v4', value: 'v4' },
        { label: 'Yoga 3 Docs', href: '/v3', value: 'v3' },
        { label: 'Yoga 2 Docs', href: '/v2', value: 'v2' },
      ]}
    />
  );
};
