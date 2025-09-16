import { GraphQLSchema } from 'graphql';
import { ApolloGateway, GatewayConfig } from '@apollo/gateway';
import { printSubgraphSchema } from '@apollo/subgraph';
import { useApolloFederation } from '@envelop/apollo-federation';
import {
  AbstractYogaDriver,
  YogaDriver,
  YogaDriverConfig,
  YogaDriverPlatform,
} from '@graphql-yoga/nestjs';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';
import { Injectable, Type } from '@nestjs/common';
import {
  GqlSubscriptionService,
  GraphQLFederationFactory,
  SubscriptionConfig,
} from '@nestjs/graphql';

export type YogaFederationDriverConfig<Platform extends YogaDriverPlatform = 'express'> =
  YogaDriverConfig<Platform>;

@Injectable()
export class YogaFederationDriver<
  Platform extends YogaDriverPlatform = 'express',
> extends AbstractYogaDriver<Platform> {
  private subscriptionService?: GqlSubscriptionService;

  constructor(private readonly graphqlFederationFactory: GraphQLFederationFactory) {
    super();
  }

  override async generateSchema(
    options: YogaFederationDriverConfig<Platform>,
  ): Promise<GraphQLSchema> {
    return await this.graphqlFederationFactory.generateSchema(options);
  }

  public override async start(options: YogaFederationDriverConfig<Platform>) {
    if (options.definitions?.path) {
      if (!options.schema) {
        throw new Error('Schema is required when providing definitions path');
      }
      await this.graphQlFactory.generateDefinitions(printSubgraphSchema(options.schema), options);
    }

    await super.start({
      ...options,
      plugins: [...(options?.plugins || []), useApolloInlineTrace()],
    });

    if (options.subscriptions && options.schema) {
      const config: SubscriptionConfig =
        options.subscriptions === true
          ? {
              'graphql-ws': true,
            }
          : options.subscriptions;

      this.subscriptionService = new GqlSubscriptionService(
        {
          schema: options.schema,
          path: options.path,
          context: options.context,
          ...config,
        },
        this.httpAdapterHost.httpAdapter?.getHttpServer(),
      );
    }
  }

  public override async stop(): Promise<void> {
    await this.subscriptionService?.stop();
  }
}

export interface YogaGatewayDriverConfig<Platform extends YogaDriverPlatform = 'express'> {
  driver?: Type<YogaDriver<Platform>>;
  gateway?: GatewayConfig;
  server?: Omit<
    YogaDriverConfig<Platform>,
    | 'endpoint'
    | 'schema'
    | 'typeDefs'
    | 'definitions'
    | 'resolvers'
    | 'resolverValidationOptions'
    | 'directiveResolvers'
    | 'autoSchemaFile'
    | 'transformSchema'
    | 'subscriptions'
    | 'buildSchemaOptions'
    | 'fieldResolverEnhancers'
    | 'driver'
  >;
}

@Injectable()
export class YogaGatewayDriver<
  Platform extends YogaDriverPlatform = 'express',
> extends AbstractYogaDriver<Platform> {
  public override async generateSchema(
    _options: YogaGatewayDriverConfig<Platform>,
  ): Promise<GraphQLSchema> {
    return new GraphQLSchema({});
  }

  public override async start(options: YogaGatewayDriverConfig<Platform>) {
    const { server: serverOpts = {}, gateway: gatewayOpts = {} } = options;
    const gateway: ApolloGateway = new ApolloGateway(gatewayOpts);

    await gateway.load();

    await super.start({
      ...serverOpts,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - There is a type mismatch here
      plugins: [...(serverOpts.plugins || []), useApolloFederation({ gateway })],
    });
  }

  public override async mergeDefaultOptions(
    options: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return {
      ...options,
      server: await super.mergeDefaultOptions(options?.['server'] ?? {}),
    };
  }
}
