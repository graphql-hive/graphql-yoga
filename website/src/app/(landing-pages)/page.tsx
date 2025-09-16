import { ReactNode } from 'react';
import Image from 'next/image';
import {
  CallToAction,
  cn,
  // FrequentlyAskedQuestions,
  GitHubIcon,
  Heading,
  Hero,
  HeroDecorationFromLogo,
  HeroLogo,
  InfoCard,
  TextLink,
  ToolsAndLibrariesCards,
  YogaIcon,
} from '@theguild/components';
import { metadata as rootMetadata } from '../layout';
import { PracticeYogaSection } from './practice-yoga-section';
// import FAQ from './faq.mdx';
import { ReachZenQuickerWithYoga } from './reach-zen-quicker-with-yoga';
import { ListItemAnchor, RunAnywhereSection } from './runs-anywhere';
import { TrulyExtendableSection } from './truly-extendable';
import arrowUpIcon from './icons/arrow-up-icon.svg';
import checkIcon from './icons/check-icon.svg';
import puzzleIcon from './icons/puzzle-icon.svg';

export const metadata = {
  title: 'GraphQL Yoga',
  alternates: {
    // to remove leading slash
    canonical: '.',
  },
  openGraph: {
    ...rootMetadata.openGraph,
    // to remove leading slash
    url: '.',
  },
};

function Page(props: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-full flex-col', props.className)}>{props.children}</div>;
}

export default function IndexPage() {
  return (
    <Page className="mx-auto max-w-[90rem] overflow-hidden">
      <Hero
        className="mx-4 md:mx-6"
        heading="High-performance GraphQL Server"
        text="Fully-featured GraphQL server designed for effortless setup and optimal developer experience."
        top={
          <HeroLogo>
            <YogaIcon />
          </HeroLogo>
        }
        checkmarks={['Fully open source', 'No vendor lock', 'Can be self-hosted!']}
      >
        <CallToAction variant="primary-inverted" href="/docs">
          Get started
        </CallToAction>
        <CallToAction variant="secondary-inverted" href="/changelog">
          Changelog
        </CallToAction>
        <CallToAction variant="tertiary" href="https://github.com/graphql-hive/graphql-yoga">
          <GitHubIcon className="size-6" />
          GitHub
        </CallToAction>
        {/* todo: this is not the same as in design, fix it when we have more time */}
        <HeroDecorationFromLogo logo={<YogaIcon />} />
      </Hero>

      <PracticeYogaSection className="mt-24" />
      <TrulyExtendableSection className="mt-24 mx-4 md:mx-6" />
      <EverythingHTTPSection />

      <RunAnywhereSection className="mx-4 md:mx-6">
        {[
          {
            name: 'AWS Lambda',
            href: '/docs/integrations/integration-with-aws-lambda',
          },
          {
            name: 'Cloudflare Workers',
            href: '/docs/integrations/integration-with-cloudflare-workers',
          },
          {
            name: 'Deno',
            href: '/docs/integrations/integration-with-deno',
          },
          {
            name: 'Express',
            href: '/docs/integrations/integration-with-express',
          },
          {
            name: 'Fastify',
            href: '/docs/integrations/integration-with-fastify',
          },
          { name: 'Koa', href: '/docs/integrations/integration-with-koa' },
          {
            name: 'NestJS',
            href: '/docs/integrations/integration-with-nestjs',
          },
          {
            name: 'Next.js',
            href: '/docs/integrations/integration-with-nextjs',
          },
          {
            name: 'SvelteKit',
            href: '/docs/integrations/integration-with-sveltekit',
          },
          { name: 'Bun', href: '/docs/integrations/integration-with-bun' },
          {
            name: '& more...',
            href: '/docs/integrations/z-other-environments',
          },
        ].map(({ name, href }) => (
          <ListItemAnchor key={name} href={href}>
            {name}
          </ListItemAnchor>
        ))}
      </RunAnywhereSection>

      <ReachZenQuickerWithYoga />

      <ToolsAndLibrariesCards />
      {/* TODO: add later */}
      {/*<FrequentlyAskedQuestions faqPages={['/']}>*/}
      {/*  <FAQ />*/}
      {/*</FrequentlyAskedQuestions>*/}
    </Page>
  );
}

function EverythingHTTPSection({ className }: { className?: string }) {
  return (
    <section className={cn('px-4 py-6 sm:py-12 md:px-6 lg:py-16 xl:p-24', className)}>
      <Heading as="h2" size="md" className="text-balance sm:px-6 sm:text-center">
        Everything HTTP
      </Heading>
      <p className="text-green-800 sm:text-center mt-4">
        Complies with the latest GraphQL over HTTP specifications for full compatibility.
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="Fully audited"
          icon={<Image src={checkIcon} alt="" />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          Meets rigorous standards as confirmed by comprehensive{' '}
          <TextLink
            href="https://github.com/enisdenjo/graphql-http/blob/master/implementations/graphql-yoga/README.md"
            className="mt-4 text-green-800"
          >
            graphql-http library audits
          </TextLink>
          .
        </InfoCard>
        <InfoCard
          as="li"
          heading="Subscriptions"
          icon={<Image src={puzzleIcon} alt="" />}
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          Supports real-time communications with built-in GraphQL{' '}
          <TextLink href="/docs/features/subscriptions" className="mt-4 text-green-800">
            Subscriptions over Server-Sent Events
          </TextLink>
          .
        </InfoCard>
        <InfoCard
          as="li"
          heading="File Uploads"
          icon={<Image src={arrowUpIcon} alt="" />}
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          Facilitates file uploads directly through GraphQL using{' '}
          <TextLink
            href="https://github.com/jaydenseric/graphql-multipart-request-spec"
            className="mt-4 text-green-800 "
          >
            the multipart request specification
          </TextLink>
          .
        </InfoCard>
      </ul>
    </section>
  );
}
