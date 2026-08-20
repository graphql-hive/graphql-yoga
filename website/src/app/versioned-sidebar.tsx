'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { VersionedNavItem } from './versioned-nav';

// These `x:`-prefixed classes belong to Nextra's own (pre-built, statically compiled)
// stylesheet, which the site already loads globally. Reusing them verbatim makes this
// stand-in sidebar look identical to Nextra's real one instead of a custom-styled widget.
const ITEM_BASE_CLASS =
  'x:focus-visible:nextra-focus x:flex x:rounded x:px-2 x:py-1.5 x:text-sm x:transition-colors x:[word-break:break-word] x:cursor-pointer x:contrast-more:border';
const ITEM_ACTIVE_CLASS =
  'x:bg-primary-100 x:font-semibold x:text-primary-800 x:dark:bg-primary-400/10 x:dark:text-primary-600 x:contrast-more:border-primary-500!';
const ITEM_INACTIVE_CLASS =
  'x:text-gray-500 x:hover:bg-gray-100 x:hover:text-gray-900 x:dark:text-neutral-400 x:dark:hover:bg-primary-100/5 x:dark:hover:text-gray-50 x:contrast-more:text-gray-900 x:contrast-more:dark:text-gray-50 x:contrast-more:border-transparent x:contrast-more:hover:border-gray-900 x:contrast-more:dark:hover:border-gray-50';
const GROUP_SUMMARY_CLASS = `${ITEM_BASE_CLASS} ${ITEM_INACTIVE_CLASS} x:items-center x:justify-between x:gap-2 x:w-full list-none [&::-webkit-details-marker]:hidden`;
const NESTED_LIST_CLASS =
  "x:grid x:gap-1 x:relative x:before:absolute x:before:inset-y-1 x:before:w-px x:before:bg-gray-200 x:before:content-[''] x:dark:before:bg-neutral-800 x:ps-3 x:before:start-0 x:pt-1 x:ms-3";

const linkClassName = (active: boolean) =>
  `${ITEM_BASE_CLASS} ${active ? ITEM_ACTIVE_CLASS : ITEM_INACTIVE_CLASS}`;

export const VersionedSidebar: FC<{ items: VersionedNavItem[] }> = ({ items }) => {
  const pathname = usePathname();

  return (
    <aside className="versioned-sidebar x:print:hidden x:flex x:flex-col x:shrink-0 md:sticky md:top-(--nextra-navbar-height) md:h-[calc(100dvh-var(--nextra-menu-height))] md:w-64">
      <div className="x:p-4 x:overflow-y-auto nextra-scrollbar nextra-mask x:grow">
        <ul className="x:grid x:gap-1">
          {items.map(item =>
            'children' in item ? (
              <li key={item.title}>
                <details
                  className="group"
                  open={item.children.some(child => child.route === pathname)}
                >
                  <summary className={GROUP_SUMMARY_CLASS}>
                    {item.title}
                    <svg
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth={2}
                      height={18}
                      className="x:shrink-0 x:rounded-sm x:p-0.5 transition-transform group-open:rotate-90"
                    >
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <ul className={NESTED_LIST_CLASS}>
                    {item.children.map(child => (
                      <li key={child.route}>
                        <Link
                          href={child.route}
                          className={linkClassName(pathname === child.route)}
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : (
              <li key={item.route}>
                <Link href={item.route} className={linkClassName(pathname === item.route)}>
                  {item.title}
                </Link>
              </li>
            ),
          )}
        </ul>
      </div>
    </aside>
  );
};
