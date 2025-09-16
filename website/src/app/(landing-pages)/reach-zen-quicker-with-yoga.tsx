import { ComponentProps, FC } from 'react';
import { CallToAction, cn, Heading, ComparisonTable as Table } from '@theguild/components';
import ComparisonTable from '../comparison-table.mdx';

export const ReachZenQuickerWithYoga: FC<ComponentProps<'section'>> = ({ className, ...rest }) => {
  return (
    <section className={cn('py-6 md:pt-[120px] md:pb-12 xl:px-24', className)} {...rest}>
      <Heading as="h2" size="md" className="text-balance sm:text-center px-4 md:px-6">
        Using Apollo Server? Reach zen quicker with Yoga.
      </Heading>
      <div className="px-4 md:px-6 flex max-lg:flex-col gap-6 lg:gap-24 mt-6 sm:mt-[64px]">
        <div className="basis-1/4">
          <Heading as="h3" size="sm" className="max-sm:text-2xl">
            Runtime&nbsp;Performance Champion
          </Heading>
          <p className="text-green-800 mt-4 mb-6">
            Yoga demonstrates superior performance with lower latency and higher request rates than
            Apollo Server. Benchmarked.
          </p>
          <CallToAction variant="tertiary" href="/docs/comparison#graphql-yoga-and-apollo-server">
            Detailed Apollo Server Comparison
          </CallToAction>
        </div>

        <ComparisonTable
          components={{
            table(props: React.HTMLAttributes<HTMLTableElement>) {
              return (
                <Table
                  scheme="neutral"
                  className="grow [&_tbody_tr:last-child]:[--highlight:initial] [&_a]:text-green-1000 [&_a]:font-medium whitespace-pre [&_td]:py-6"
                  {...props}
                />
              );
            },
            tr: Table.Row,
            td: Table.Cell,
            th(props: React.HTMLAttributes<HTMLTableCellElement>) {
              return <Table.Header className="sm:w-1/4 whitespace-pre" {...props} />;
            },
          }}
        />
      </div>
    </section>
  );
};
