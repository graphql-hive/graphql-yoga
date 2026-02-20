import { StaticImageData } from 'next/image';
import apolloIcon from '../../public/assets/logos/apollo.svg';
import assetsIcon from '../../public/assets/logos/assets.png';
import auth0Icon from '../../public/assets/logos/auth0.png';
import datadogIcon from '../../public/assets/logos/datadog.svg';
import genericAuthIcon from '../../public/assets/logos/generic_auth.png';
import graphqlArmorIcon from '../../public/assets/logos/graphql-armor.svg';
import graphqlIcon from '../../public/assets/logos/graphql.png';
import inngestIcon from '../../public/assets/logos/inngest.png';
import modulesIcon from '../../public/assets/logos/modules.svg';
import newrelicIcon from '../../public/assets/logos/newrelic.png';
import openTelemetryIcon from '../../public/assets/logos/opentelemetry.png';
import persistedOperationsIcon from '../../public/assets/logos/persisted_operations.png';
import prometheusIcon from '../../public/assets/logos/prometheus.png';
import rateLimiterIcon from '../../public/assets/logos/rate_limiter.png';
import sentryIcon from '../../public/assets/logos/sentry.svg';
import envelopIcon from '../../public/logo.png';
import hiveIcon from './hive-plugins-logo-green.svg';

export const ALL_TAGS = [
  'tracing',
  'metrics',
  'core',
  'errors',
  'security',
  'utilities',
  'performance',
  'caching',
  'devtool',
  'authentication',
  'authorization',
  'schema',
  'subscription',
] as const;

export type Tags = (typeof ALL_TAGS)[number];

export const PLUGINS: {
  identifier: string;
  title: string;
  npmPackage: string;
  icon: StaticImageData;
  tags: Tags[];
  githubReadme: {
    repo: string;
    path: string;
  };
  className?: string;
}[] = [
  {
    identifier: 'use-sentry',
    title: 'useSentry',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/sentry/README.md',
    },
    npmPackage: '@envelop/sentry',
    icon: sentryIcon,
    className: 'dark:invert',
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-statsd',
    title: 'useStatsD',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/statsd/README.md',
    },
    npmPackage: '@envelop/statsd',
    icon: datadogIcon,
    tags: ['metrics', 'errors'],
  },
  {
    identifier: 'use-schema',
    title: 'useSchema',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-schema.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'schema'],
  },
  {
    identifier: 'use-schema-by-context',
    title: 'useSchemaByContext',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-schema-by-context.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'schema'],
  },
  {
    identifier: 'use-validation-rule',
    title: 'useValidationRule',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-validation-rule.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-error-handler',
    title: 'useErrorHandler',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-error-handler.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'errors'],
  },
  {
    identifier: 'use-masked-errors',
    title: 'useMaskedErrors',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-masked-errors.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'errors', 'security'],
  },
  {
    identifier: 'use-engine',
    title: 'useEngine',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-engine.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-extend-context',
    title: 'useExtendContext',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-extend-context.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-immediate-introspection',
    title: 'useImmediateIntrospection',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/immediate-introspection/README.md',
    },
    npmPackage: '@envelop/immediate-introspection',
    icon: envelopIcon,
    tags: ['utilities', 'performance'],
  },
  {
    identifier: 'use-logger',
    title: 'useLogger',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-logger.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-payload-formatter',
    title: 'usePayloadFormatter',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/core/docs/use-payload-formatter.md',
    },
    npmPackage: '@envelop/core',
    icon: envelopIcon,
    tags: ['core', 'utilities'],
  },
  {
    identifier: 'use-graphql-jit',
    title: 'useGraphQLJit',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/graphql-jit/README.md',
    },
    npmPackage: '@envelop/graphql-jit',
    icon: graphqlIcon,
    tags: ['performance'],
  },
  {
    identifier: 'use-parser-cache',
    title: 'useParserCache',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/parser-cache/README.md',
    },
    npmPackage: '@envelop/parser-cache',
    icon: envelopIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-validation-cache',
    title: 'useValidationCache',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/validation-cache/README.md',
    },
    npmPackage: '@envelop/validation-cache',
    icon: envelopIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-data-loader',
    title: 'useDataLoader',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/dataloader/README.md',
    },
    npmPackage: '@envelop/dataloader',
    icon: graphqlIcon,
    tags: ['performance', 'caching'],
  },
  {
    identifier: 'use-apollo-tracing',
    title: 'useApolloTracing',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/apollo-tracing/README.md',
    },
    npmPackage: '@envelop/apollo-tracing',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['devtool', 'metrics'],
  },
  {
    identifier: 'use-apollo-datasources',
    title: 'useApolloDataSources',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/apollo-datasources/README.md',
    },
    npmPackage: '@envelop/apollo-datasources',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['devtool', 'utilities'],
  },
  {
    identifier: 'use-open-telemetry',
    title: 'useOpenTelemetry',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/opentelemetry/README.md',
    },
    npmPackage: '@envelop/opentelemetry',
    icon: openTelemetryIcon,
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-generic-auth',
    title: 'useGenericAuth',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/generic-auth/README.md',
    },
    npmPackage: '@envelop/generic-auth',
    icon: genericAuthIcon,
    className: 'dark:invert',
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    identifier: 'use-auth0',
    title: 'useAuth0',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/auth0/README.md',
    },
    npmPackage: '@envelop/auth0',
    icon: auth0Icon,
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    identifier: 'use-graphql-modules',
    title: 'useGraphQLModules',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/graphql-modules/README.md',
    },
    npmPackage: '@envelop/graphql-modules',
    icon: modulesIcon,
    tags: ['schema', 'utilities', 'devtool'],
  },
  {
    identifier: 'use-rate-limiter',
    title: 'useRateLimiter',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/rate-limiter/README.md',
    },
    npmPackage: '@envelop/rate-limiter',
    icon: rateLimiterIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities', 'security'],
  },
  {
    identifier: 'use-disable-introspection',
    title: 'useDisableIntrospection',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/disable-introspection/README.md',
    },
    npmPackage: '@envelop/disable-introspection',
    icon: graphqlIcon,
    tags: ['utilities', 'security'],
  },
  {
    identifier: 'use-filter-allowed-operations',
    title: 'useFilterAllowedOperations',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/filter-operation-type/README.md',
    },
    npmPackage: '@envelop/filter-operation-type',
    icon: graphqlIcon,
    tags: ['utilities', 'security'],
  },
  {
    identifier: 'use-preload-assets',
    title: 'usePreloadAssets',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/preload-assets/README.md',
    },
    npmPackage: '@envelop/preload-assets',
    icon: assetsIcon,
    className: 'dark:invert',
    tags: ['utilities'],
  },
  {
    identifier: 'use-persisted-operations',
    title: 'usePersistedOperations',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/persisted-operations/README.md',
    },
    npmPackage: '@envelop/persisted-operations',
    icon: persistedOperationsIcon,
    className: 'dark:invert',
    tags: ['security', 'performance'],
  },
  {
    identifier: 'use-graphql-hive',
    title: 'useHive',
    githubReadme: {
      repo: 'graphql-hive/console',
      path: 'packages/libraries/envelop/README.md',
    },
    npmPackage: '@graphql-hive/envelop',
    icon: hiveIcon,
    tags: ['tracing', 'metrics', 'devtool'],
  },
  {
    identifier: 'use-newrelic',
    title: 'useNewRelic',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/newrelic/README.md',
    },
    npmPackage: '@envelop/newrelic',
    icon: newrelicIcon,
    tags: ['tracing', 'metrics', 'errors'],
  },
  {
    identifier: 'use-live-query',
    title: 'useLiveQuery',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/live-query/README.md',
    },
    npmPackage: '@envelop/live-query',
    icon: graphqlIcon,
    tags: ['utilities'],
  },
  {
    identifier: 'use-fragment-arguments',
    title: 'useFragmentArguments',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/fragment-arguments/README.md',
    },
    npmPackage: '@envelop/fragment-arguments',
    icon: graphqlIcon,
    tags: ['utilities'],
  },
  {
    identifier: 'use-apollo-server-errors',
    title: 'useApolloServerErrors',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/apollo-server-errors/README.md',
    },
    npmPackage: '@envelop/apollo-server-errors',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['utilities', 'errors'],
  },
  {
    identifier: 'use-operation-field-permissions',
    title: 'useOperationFieldPermissions',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/operation-field-permissions/README.md',
    },
    npmPackage: '@envelop/operation-field-permissions',
    icon: graphqlIcon,
    tags: ['security', 'authorization'],
  },
  {
    identifier: 'use-extended-validation',
    title: 'useExtendedValidation',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/extended-validation/README.md',
    },
    npmPackage: '@envelop/extended-validation',
    icon: graphqlIcon,
    tags: ['devtool', 'utilities'],
  },
  {
    identifier: 'use-prometheus',
    title: 'usePrometheus',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/prometheus/README.md',
    },
    npmPackage: '@envelop/prometheus',
    icon: prometheusIcon,
    tags: ['metrics', 'errors'],
  },
  {
    identifier: 'use-context-value-per-execute-subscription-event',
    title: 'useContextValuePerExecuteSubscriptionEvent',
    npmPackage: '@envelop/execute-subscription-event',
    icon: graphqlIcon,
    tags: ['utilities', 'subscription'],
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/execute-subscription-event/README.md',
    },
  },
  {
    identifier: 'use-resource-limitations',
    title: 'useResourceLimitations',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/resource-limitations/README.md',
    },
    npmPackage: '@envelop/resource-limitations',
    icon: rateLimiterIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities', 'security'],
  },
  {
    identifier: 'use-response-cache',
    title: 'useResponseCache',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/response-cache/README.md',
    },
    npmPackage: '@envelop/response-cache',
    icon: envelopIcon,
    tags: ['caching', 'performance'],
  },
  {
    identifier: 'use-apollo-federation',
    title: 'useApolloFederation',
    githubReadme: {
      repo: 'graphql-hive/envelop',
      path: 'packages/plugins/apollo-federation/README.md',
    },
    npmPackage: '@envelop/apollo-federation',
    icon: apolloIcon,
    className: 'dark:invert',
    tags: ['schema', 'utilities'],
  },
  {
    identifier: 'graphql-armor-max-aliases',
    title: 'maxAliasesPlugin',
    githubReadme: {
      repo: 'Escape-Technologies/graphql-armor',
      path: 'packages/plugins/max-aliases/README.md',
    },
    npmPackage: '@escape.tech/graphql-armor-max-aliases',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-depth',
    title: 'maxDepthPlugin',
    githubReadme: {
      repo: 'Escape-Technologies/graphql-armor',
      path: 'packages/plugins/max-depth/README.md',
    },
    npmPackage: '@escape.tech/graphql-armor-max-depth',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-directives',
    title: 'maxDirectivesPlugin',
    githubReadme: {
      repo: 'Escape-Technologies/graphql-armor',
      path: 'packages/plugins/max-directives/README.md',
    },
    npmPackage: '@escape.tech/graphql-armor-max-directives',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-max-tokens',
    title: 'maxTokensPlugin',
    githubReadme: {
      repo: 'Escape-Technologies/graphql-armor',
      path: 'packages/plugins/max-tokens/README.md',
    },
    npmPackage: '@escape.tech/graphql-armor-max-tokens',
    icon: graphqlArmorIcon,
    tags: ['performance', 'security'],
  },
  {
    identifier: 'graphql-armor-block-field-suggestions',
    title: 'blockFieldSuggestions',
    githubReadme: {
      repo: 'Escape-Technologies/graphql-armor',
      path: 'packages/plugins/block-field-suggestions/README.md',
    },
    npmPackage: '@escape.tech/graphql-armor-block-field-suggestions',
    icon: graphqlArmorIcon,
    tags: ['security'],
  },
  {
    identifier: 'use-inngest',
    title: 'useInngest',
    githubReadme: {
      repo: 'inngest/envelop-plugin-inngest',
      path: 'packages/plugins/inngest/README.md',
    },
    npmPackage: 'envelop-plugin-inngest',
    icon: inngestIcon,
    tags: ['tracing', 'metrics'],
  },
];
