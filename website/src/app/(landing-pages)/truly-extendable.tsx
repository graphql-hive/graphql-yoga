import { ComponentProps, FC } from 'react';
import Image from 'next/image';
import {
  Anchor,
  CallToAction,
  cn,
  Heading,
  InfoCard,
  InfoCardProps,
  MarqueeRows,
  YogaIcon,
} from '@theguild/components';
import apolloIcon from './icons/apollo-icon.svg';
import safeLineIcon from './icons/safe-line-icon.svg';
import serverLineIcon from './icons/server-line-icon.svg';
import timerLineIcon from './icons/timer-line-icon.svg';

export const TrulyExtendableSection: FC<ComponentProps<'section'>> = ({ className, ...props }) => {
  return (
    <section
      className={cn(
        'bg-green-1000 relative isolate overflow-hidden rounded-3xl text-white',
        'p-8 md:p-[72px]',
        className,
      )}
      {...props}
    >
      <Heading as="h2" size="md" className="max-sm:text-[32px]">
        Truly extendable
      </Heading>
      <p className="mt-4 text-white/80">
        Highly extendable through Envelop plugins, allowing customization to fit any
        <br className="max-sm:hidden" /> development needs.
      </p>
      <div className="relative flex gap-6 xl:gap-20 2xl:gap-24 my-6 xl:my-12 max-xl:flex-col">
        <div className="xl:basis-1/2 shrink-0 overflow-auto nextra-scrollbar -mx-8 px-8 -my-3 py-3">
          <div className="flex gap-2 sm:grid sm:grid-cols-2 sm:gap-6">
            <InfoCardLink
              heading="Apollo Federation"
              icon={<Image src={apolloIcon} alt="" />}
              href="/docs/features/apollo-federation"
            >
              Fully supports Apollo Federation for managing complex supergraphs and subgraphs.
            </InfoCardLink>
            <InfoCardLink
              heading="Persisted operations"
              icon={<Image src={safeLineIcon} alt="" />}
              href="/features/persisted-operations"
            >
              Mitigates the risk of arbitrary GraphQL operations with robust persistence
              capabilities.
            </InfoCardLink>
            <InfoCardLink
              heading="Response caching"
              icon={<Image src={serverLineIcon} alt="" />}
              href="/docs/features/response-caching"
            >
              Optimizes server performance by caching responses, significantly reducing server load.
            </InfoCardLink>
            <InfoCardLink
              heading="Rate limiting"
              icon={<Image src={timerLineIcon} alt="" />}
              href="https://the-guild.dev/graphql/envelop/plugins/use-rate-limiter"
            >
              Prevents denial of service attacks with advanced rate limiting.
            </InfoCardLink>
          </div>
        </div>
        <div className="lg:basis-1/2 xl:w-1/2 shrink max-xl:order-first relative group">
          <MarqueeRows rows={9} speed="slow" pauseOnHover>
            {ENVELOP_PLUGINS.map(plugin => (
              <Anchor
                key={plugin.title}
                href={plugin.href}
                className="text-[10px] sm:text-sm hive-focus rounded-lg bg-green-900 px-2 sm:px-4 py-1.5 sm:py-3 text-green-600 transition hover:bg-green-800 hover:text-white"
              >
                {plugin.title}
              </Anchor>
            ))}
          </MarqueeRows>
          <YogaIcon
            className="group-hover:opacity-0 aria-hidden absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 size-2/3 transition duration-700 pointer-events-none"
            stroke="white"
            strokeWidth="0.2"
            fill="url(#myGradient)"
          />
          <svg className="h-0">
            <defs>
              <linearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#86b6c1', stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: '#4f96a6', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <CallToAction variant="primary-inverted" href="/docs/features/envelop-plugins">
        Learn more about Envelop Plugins
      </CallToAction>
    </section>
  );
};

function InfoCardLink({ href, ...rest }: InfoCardProps.InfoCardLinkProps) {
  return (
    <InfoCard
      href={href}
      scheme="green"
      className="[&_div]:text-sm [&_h3]:text-base rounded-2xl !p-6 max-sm:w-[280px] shrink-0"
      {...rest}
    />
  );
}

const ENVELOP_PLUGINS: { title: string; href: `https://${string}` }[] = [
  {
    title: 'useSentry',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/sentry',
  },
  {
    title: 'useStatsD',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/statsd',
  },
  {
    title: 'useSchema',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useSchemaByContext',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useValidationRule',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useErrorHandler',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useMaskedErrors',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useEngine',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useExtendContext',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useImmediateIntrospection',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/immediate-introspection',
  },
  {
    title: 'useLogger',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'usePayloadFormatter',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/core',
  },
  {
    title: 'useGraphQLJit',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/graphql-jit',
  },
  {
    title: 'useParserCache',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/parser-cache',
  },
  {
    title: 'useValidationCache',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/validation-cache',
  },
  {
    title: 'useDataLoader',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/dataloader',
  },
  {
    title: 'useApolloTracing',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/apollo-tracing',
  },
  {
    title: 'useApolloDataSources',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/apollo-datasources',
  },
  {
    title: 'useOpenTelemetry',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/opentelemetry',
  },
  {
    title: 'useGenericAuth',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/generic-auth',
  },
  {
    title: 'useAuth0',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/auth0',
  },
  {
    title: 'useGraphQLModules',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/graphql-modules',
  },
  {
    title: 'useRateLimiter',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/rate-limiter',
  },
  {
    title: 'useDisableIntrospection',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/disable-introspection',
  },
  {
    title: 'useFilterAllowedOperations',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/filter-operation-type',
  },
  {
    title: 'usePreloadAssets',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/preload-assets',
  },
  {
    title: 'usePersistedOperations',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/persisted-operations',
  },
  {
    title: 'useHive',
    href: 'https://the-guild.dev/graphql/hive/docs/other-integrations/envelop',
  },
  {
    title: 'useNewRelic',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/newrelic',
  },
  {
    title: 'useLiveQuery',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/live-query',
  },
  {
    title: 'useFragmentArguments',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/fragment-arguments',
  },
  {
    title: 'useApolloServerErrors',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/apollo-server-errors',
  },
  {
    title: 'useOperationFieldPermissions',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/operation-field-permissions',
  },
  {
    title: 'useExtendedValidation',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/extended-validation',
  },
  {
    title: 'usePrometheus',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/prometheus',
  },
  {
    title: 'useContextValuePerExecuteSubscriptionEvent',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/execute-subscription-event',
  },
  {
    title: 'useResourceLimitations',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/resource-limitations',
  },
  {
    title: 'useResponseCache',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/response-cache',
  },
  {
    title: 'useApolloFederation',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/apollo-federation',
  },
  {
    title: 'maxAliasesPlugin',
    href: 'https://escape.tech/graphql-armor/docs/plugins/max-aliases',
  },
  {
    title: 'maxDepthPlugin',
    href: 'https://escape.tech/graphql-armor/docs/plugins/max-depth',
  },
  {
    title: 'maxDirectivesPlugin',
    href: 'https://escape.tech/graphql-armor/docs/plugins/max-directives',
  },
  {
    title: 'maxTokensPlugin',
    href: 'https://escape.tech/graphql-armor/docs/plugins/max-tokens',
  },
  {
    title: 'blockFieldSuggestions',
    href: 'https://escape.tech/graphql-armor/docs/plugins/block-field-suggestions',
  },
  {
    title: 'useInngest',
    href: 'https://github.com/inngest/envelop-plugin-inngest',
  },
  {
    title: 'useDepthLimit',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/depth-limit',
  },
  {
    title: 'useGraphQLMiddleware',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/graphql-middleware',
  },
  {
    title: 'useOnResolve',
    href: 'https://github.com/n1ru4l/envelop/tree/main/packages/plugins/on-resolve',
  },
];
