import { ComponentProps, FC, ReactNode } from 'react';
import { Anchor, ArrowIcon, cn, Heading } from '@theguild/components';

export const RunAnywhereSection: FC<ComponentProps<'section'>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <section
      className={cn(
        'relative rounded-3xl bg-blue-400 p-4 pt-6 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:py-[120px]',
        className,
      )}
      {...props}
    >
      <Heading as="h3" size="md" className="text-center">
        Run anywhere
      </Heading>
      {/* the design has text-green-800 here, but it doesn't pass the contrast check */}
      <p className="mt-4 text-center text-balance">
        Deploy Yoga across any JavaScript environment, powered by its versatile Fetch API
        compatibility.
      </p>

      <ul className="flex mt-4 sm:mt-8 lg:mt-16 flex-wrap gap-2 sm:gap-4 max-sm:grid max-sm:grid-cols-3 justify-center items-center max-w-[1200px] mx-auto">
        {children}
      </ul>
    </section>
  );
};

export const ListItemAnchor: FC<{
  children: ReactNode;
  href: string;
  className?: string;
}> = ({ children, href, className }) => {
  return (
    <li className={className}>
      <Anchor
        className="hive-focus flex items-center gap-4 bg-blue-200 hover:bg-blue-100 rounded-2xl px-4 sm:px-6 md:px-8 h-[102px]"
        href={href}
      >
        {children}
        <ArrowIcon className="w-6 h-6 max-sm:hidden" />
      </Anchor>
    </li>
  );
};
