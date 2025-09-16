import { ReactNode } from 'react';
import { HiveLayoutConfig } from '@theguild/components';

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <HiveLayoutConfig widths="landing-narrow" />
    </>
  );
}
