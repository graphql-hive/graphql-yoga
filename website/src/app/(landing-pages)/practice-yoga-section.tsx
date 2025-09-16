import Image from 'next/image';
import { CallToAction, cn, Heading, InfoCard, YogaIcon } from '@theguild/components';
import errorWarningIcon from './icons/error-warning-icon.svg';
import graphqlIcon from './icons/graphql-icon.svg';
import pulseLineIcon from './icons/pulse-line-icon.svg';
import manInBlackClothingPracticingYoga from './man-in-black-clothing-practicing-yoga-minimalistic.png';

export function PracticeYogaSection({ className }: { className?: string }) {
  const yogaMan = (
    <>
      <Image
        src={manInBlackClothingPracticingYoga}
        alt="Man in black clothing practicing yoga"
        className="rounded-3xl h-96 lg:h-full object-cover"
      />
      <YogaIcon
        className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 size-2/3"
        stroke="white"
        strokeWidth="0.2"
        fill="none"
      />
    </>
  );

  return (
    <section className={cn('flex max-lg:flex-col gap-6 lg:gap-24 px-4 xl:px-24', className)}>
      <div className="grow">
        <Heading as="h2" size="md">
          Practice Yoga while doing server-work
        </Heading>
        <p className="text-green-800 mt-4">
          Yoga ensures optimal configuration out-of-the-box, enhancing performance and developer
          workflow.
        </p>
        <div className="relative lg:hidden mt-6">{yogaMan}</div>
        <div className="flex my-12 -m-4 max-sm:flex-col">
          <InfoCard
            heading="Error masking"
            icon={<Image src={errorWarningIcon} alt="" />}
            className="flex-1 p-4 md:p-4 bg-transparent hive-focus rounded-md"
            href="/docs/features/error-masking"
          >
            Enhance security by masking errors to prevent sensitive data leaks.
          </InfoCard>
          <InfoCard
            heading="Health checks"
            icon={<Image src={pulseLineIcon} alt="" />}
            className="flex-1 p-4 md:p-4 bg-transparent hive-focus rounded-md"
            href="/docs/features/health-check"
          >
            Built-in health checks to ensure server vitality and readiness.
          </InfoCard>
          <InfoCard
            heading="GraphiQL Integration"
            icon={<Image src={graphqlIcon} alt="" />}
            className="flex-1 p-4 md:p-4 bg-transparent hive-focus rounded-md"
            href="/docs/features/graphiql"
          >
            In-browser IDE for seamless writing, validation, and testing of GraphQL operations.
          </InfoCard>
        </div>
        <CallToAction variant="primary" href="/docs">
          Learn more
        </CallToAction>
      </div>
      <div className="basis-5/12 shrink-0 relative max-lg:hidden">{yogaMan}</div>
    </section>
  );
}
