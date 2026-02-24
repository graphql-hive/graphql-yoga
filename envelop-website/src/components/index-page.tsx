import {
  FeatureList,
  HeroGradient,
  HeroIllustration,
  HeroMarketplace,
  InfoList,
  NPMBadge,
} from '@theguild/components';
import featuresModernImage from '../../public/assets/features-modern.png';
import featuresPerformantImage from '../../public/assets/features-performant.png';
import featuresPluggableImage from '../../public/assets/features-pluggable.png';
import homeClawImage from '../../public/assets/home-claw.png';
import homeCommunicationImage from '../../public/assets/home-communication.png';

export function IndexPage() {
  return (
    <>
      <HeroGradient
        title="Envelop: The Missing GraphQL Plugin System"
        description="Develop and share plugins that are usable with any GraphQL server framework or schema."
        link={{
          href: '/docs',
          children: 'Get Started',
          title: 'Learn more about GraphQL Envelop',
        }}
        version={<NPMBadge name="@envelop/core" />}
        colors={['#ff34ae', '#1cc8ee']}
        image={{
          src: homeClawImage,
          alt: 'Illustration',
        }}
      />
      <FeatureList
        title="What Is Envelop?"
        items={[
          {
            image: {
              alt: 'Pluggable',
              src: featuresPluggableImage,
            },
            title: 'Pluggable',
            description: 'Powerful plugin system that wraps the entire GraphQL execution pipeline.',
          },
          {
            image: {
              alt: 'Flexible',
              src: featuresModernImage,
            },
            title: 'Flexible',
            description:
              'Use any HTTP server, and any GraphQL schema (code-first or schema-first).',
          },
          {
            image: {
              alt: 'Develop Faster',
              src: featuresPerformantImage,
            },
            title: 'Develop Faster',
            description: `You don't have to reinvent the wheel for every feature. Write or reuse existing plugins.`,
          },
        ]}
      />
      <HeroIllustration
        title="How Does It Work?"
        description={`Envelop provides a low-level hook-based plugin API for developers. By combining plugins, you can compose your own GraphQL "framework", and get a modified version of GraphQL with the capabilities you need.`}
        image={{
          src: homeCommunicationImage,
          alt: 'Illustration',
        }}
        flipped
      />
      <HeroMarketplace
        title="Plugin Hub"
        description="Find, explore, try and test plugins for Envelop."
        link={{
          href: '/plugins',
          children: 'Explore Plugins',
          title: 'Learn more about the Plugin Hub',
        }}
      />
      <InfoList
        title="Learn More"
        items={[
          {
            title: 'The Envelop Approach',
            description: 'Learn more about Envelop core and how it works',
            link: {
              href: '/docs',
              children: 'Documentation',
              title: 'Read the documentation',
            },
          },
          {
            title: 'Integrations',
            description:
              'Integrate envelop with your existing setup quickly, based on usage examples.',
            link: {
              href: '/docs/integrations',
              children: 'Integrations & Examples',
              title: 'Read the documentation',
            },
          },
          {
            title: 'Custom Plugins',
            description: 'Learn how to plan, build and share envelop plugins.',
            link: {
              href: '/docs/plugins',
              children: 'API Reference',
              title: 'Read the documentation',
            },
          },
        ]}
      />
    </>
  );
}
