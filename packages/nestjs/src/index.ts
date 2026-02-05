import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { GraphQLSchema, printSchema } from 'graphql';
import {
  createYoga,
  filter,
  mergeSchemas,
  pipe,
  YogaSchemaDefinition,
  YogaServerInstance,
  YogaServerOptions,
} from 'graphql-yoga';
import type { ExecutionParams } from 'subscriptions-transport-ws';
import { Injectable, Logger } from '@nestjs/common';
import {
  AbstractGraphQLDriver,
  GqlModuleOptions,
  GqlSubscriptionService,
  SubscriptionConfig,
} from '@nestjs/graphql';

export type YogaDriverPlatform = 'express' | 'fastify';

export type YogaDriverServerContext<Platform extends YogaDriverPlatform> =
  Platform extends 'fastify'
    ? {
        req: FastifyRequest;
        reply: FastifyReply;
      }
    : {
        req: ExpressRequest;
        res: ExpressResponse;
      };

export type YogaDriverServerOptions<Platform extends YogaDriverPlatform> = Omit<
  YogaServerOptions<YogaDriverServerContext<Platform>, never>,
  'context' | 'schema' | 'graphqlEndpoint'
> & {
  conditionalSchema?: YogaSchemaDefinition<YogaDriverServerContext<Platform>, never> | undefined;
};

export type YogaDriverServerInstance<Platform extends YogaDriverPlatform> = YogaServerInstance<
  YogaDriverServerContext<Platform>,
  never
>;

export type YogaDriverConfig<Platform extends YogaDriverPlatform = 'express'> = GqlModuleOptions &
  YogaDriverServerOptions<Platform> &
  (
    | {
        /**
         * Subscriptions configuration. Passing `true` will install only `graphql-ws`.
         */
        subscriptions?: boolean | YogaDriverSubscriptionConfig;
        conditionalSchema?: never;
      }
    | {
        /**
         * TODO: Support conditional schema with subscriptions
         */
        subscriptions?: never;
        conditionalSchema?:
          | YogaSchemaDefinition<YogaDriverServerContext<Platform>, never>
          | undefined;
      }
  );

export type YogaDriverSubscriptionConfig = {
  'graphql-ws'?: Omit<SubscriptionConfig['graphql-ws'], 'onSubscribe'>;
  'subscriptions-transport-ws'?: Omit<
    SubscriptionConfig['subscriptions-transport-ws'],
    'onOperation'
  >;
};

export abstract class AbstractYogaDriver<
  Platform extends YogaDriverPlatform,
> extends AbstractGraphQLDriver<YogaDriverConfig<Platform>> {
  protected yoga!: YogaDriverServerInstance<Platform>;

  public async start(options: YogaDriverConfig<Platform>) {
    const platformName = this.httpAdapterHost.httpAdapter.getType() as Platform;
    options = {
      ...options,
      // disable error masking by default
      maskedErrors: options.maskedErrors == null ? false : options.maskedErrors,
      // disable graphiql in production
      graphiql:
        options.graphiql == null ? process.env['NODE_ENV'] !== 'production' : options.graphiql,
    };
    if (platformName === 'express') {
      return this.registerExpress(options as YogaDriverConfig<'express'>);
    }
    if (platformName === 'fastify') {
      return this.registerFastify(options as YogaDriverConfig<'fastify'>);
    }
    throw new Error(`Provided HttpAdapter "${platformName}" not supported`);
  }

  public async stop() {
    // noop
  }

  protected registerExpress(
    { conditionalSchema, ...options }: YogaDriverConfig<'express'>,
    { preStartHook }: { preStartHook?: (app: Express) => void } = {},
  ) {
    const app: Express = this.httpAdapterHost.httpAdapter.getInstance();

    preStartHook?.(app);

    // nest's logger doesnt have the info method
    class LoggerWithInfo extends Logger {
      constructor(context: string) {
        super(context);
      }

      info(message: any, ...args: any[]) {
        this.log(message, ...args);
      }
    }

    const schema = this.mergeConditionalSchema<'express'>(conditionalSchema, options.schema);

    const yoga = createYoga<YogaDriverServerContext<'express'>>({
      ...options,
      schema,
      graphqlEndpoint: options.path,
      // disable logging by default
      // however, if `true` use nest logger
      logging:
        options.logging == null
          ? false
          : options.logging
            ? new LoggerWithInfo('YogaDriver')
            : options.logging,
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - TODO: fix types
    this.yoga = yoga;

    app.use(yoga.graphqlEndpoint, (req, res) => yoga(req, res, { req, res }));
  }

  protected registerFastify(
    { conditionalSchema, ...options }: YogaDriverConfig<'fastify'>,
    { preStartHook }: { preStartHook?: (app: FastifyInstance) => void } = {},
  ) {
    const app: FastifyInstance = this.httpAdapterHost.httpAdapter.getInstance();

    preStartHook?.(app);

    const schema = this.mergeConditionalSchema<'fastify'>(conditionalSchema, options.schema);

    const yoga = createYoga<YogaDriverServerContext<'fastify'>>({
      ...options,
      schema,
      graphqlEndpoint: options.path,
      // disable logging by default
      // however, if `true` use fastify logger
      logging: options.logging == null ? false : options.logging ? app.log : options.logging,
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - TODO: fix types
    this.yoga = yoga;

    app.all(yoga.graphqlEndpoint, async (req, reply) => {
      const response = await yoga.handleNodeRequestAndResponse(req, reply, {
        req,
        reply,
      });
      for (const [key, value] of response.headers.entries()) reply.header(key, value);
      reply.status(response.status);
      reply.send(response.body);
      return reply;
    });
  }

  private mergeConditionalSchema<T extends YogaDriverPlatform>(
    conditionalSchema: YogaSchemaDefinition<YogaDriverServerContext<T>, never> | undefined,
    schema?: GraphQLSchema,
  ) {
    let mergedSchema: YogaSchemaDefinition<YogaDriverServerContext<T>, never> | undefined = schema;

    if (conditionalSchema) {
      mergedSchema = async request => {
        const schemas: GraphQLSchema[] = [];

        if (schema) {
          schemas.push(schema);
        }

        const conditionalSchemaResult =
          typeof conditionalSchema === 'function'
            ? await conditionalSchema(request)
            : await conditionalSchema;

        if (conditionalSchemaResult) {
          schemas.push(conditionalSchemaResult);
        }

        return mergeSchemas({
          schemas,
        });
      };
    }

    return mergedSchema;
  }

  public override subscriptionWithFilter<TPayload, TVariables, TContext>(
    instanceRef: unknown,
    filterFn: (
      payload: TPayload,
      variables: TVariables,
      context: TContext,
    ) => boolean | Promise<boolean>,
    // disable next error, the original function in @nestjs/graphql is also untyped

    createSubscribeContext: Function,
  ) {
    return async (...args: [TPayload, TVariables, TContext]) => {
      return pipe(
        await createSubscribeContext()(...args),
        filter((payload: TPayload) =>
          // typecast the spread sliced args to avoid error TS 2556, see https://github.com/microsoft/TypeScript/issues/49802
          filterFn.call(instanceRef, payload, ...(args.slice(1) as [TVariables, TContext])),
        ),
      );
    };
  }
}

@Injectable()
export class YogaDriver<
  Platform extends YogaDriverPlatform = 'express',
> extends AbstractYogaDriver<Platform> {
  private subscriptionService?: GqlSubscriptionService;

  public override async start(options: YogaDriverConfig<Platform>) {
    if (options.definitions?.path) {
      if (!options.schema) {
        throw new Error('Schema is required when generating definitions');
      }
      await this.graphQlFactory.generateDefinitions(printSchema(options.schema), options);
    }

    await super.start(options);

    if (options.subscriptions) {
      if (!options.schema) {
        throw new Error('Schema is required when using subscriptions');
      }

      const config: SubscriptionConfig =
        options.subscriptions === true
          ? {
              'graphql-ws': true,
            }
          : options.subscriptions;

      if (config['graphql-ws']) {
        config['graphql-ws'] = typeof config['graphql-ws'] === 'object' ? config['graphql-ws'] : {};

        if (options.conditionalSchema) {
          throw new Error(`
            Conditional schema is not supported with graphql-ws.
          `);
        }

        config['graphql-ws'].onSubscribe = async (ctx, _id, params) => {
          const { schema, execute, subscribe, contextFactory, parse, validate } =
            this.yoga.getEnveloped({
              ...ctx,
              // @ts-expect-error context extra is from graphql-ws/lib/use/ws
              req: ctx.extra.request,
              // @ts-expect-error context extra is from graphql-ws/lib/use/ws
              socket: ctx.extra.socket,
              params,
            });

          const args = {
            schema,
            operationName: params.operationName,
            document: parse(params.query),
            variableValues: params.variables,
            contextValue: await contextFactory({ execute, subscribe }),
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
        };
      }

      if (config['subscriptions-transport-ws']) {
        config['subscriptions-transport-ws'] =
          typeof config['subscriptions-transport-ws'] === 'object'
            ? config['subscriptions-transport-ws']
            : {};

        if (options.conditionalSchema) {
          throw new Error(`
            Conditional schema is not supported with subscriptions-transport-ws.
          `);
        }

        config['subscriptions-transport-ws'].onOperation = async (
          _msg: unknown,
          params: ExecutionParams,
          ws: WebSocket,
        ) => {
          const { schema, execute, subscribe, contextFactory, parse, validate } =
            this.yoga.getEnveloped({
              ...params.context,
              req:
                // @ts-expect-error upgradeReq does exist but is untyped
                ws.upgradeReq,
              socket: ws,
              params,
            });

          const args = {
            schema,
            operationName: params.operationName,
            document: typeof params.query === 'string' ? parse(params.query) : params.query,
            variables: params.variables,
            context: await contextFactory({ execute, subscribe }),
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
        };
      }

      this.subscriptionService = new GqlSubscriptionService(
        {
          schema: options.schema,
          path: options.path,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
          // @ts-ignore
          execute: (...args) => {
            const contextValue =
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
              // @ts-ignore
              args[0].contextValue ||
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
              // @ts-ignore
              args[3];
            if (!contextValue) {
              throw new Error('Execution arguments are missing the context value');
            }
            return (
              contextValue
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
                // @ts-ignore
                .execute(...args)
            );
          },
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
          // @ts-ignore
          subscribe: (...args) => {
            const contextValue =
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
              // @ts-ignore
              args[0].contextValue ||
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
              // @ts-ignore
              args?.[3];
            if (!contextValue) {
              throw new Error('Subscribe arguments are missing the context value');
            }
            return (
              contextValue
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- because we test both graphql v15 and v16
                // @ts-ignore
                .subscribe(...args)
            );
          },
          ...config,
        },
        this.httpAdapterHost.httpAdapter.getHttpServer(),
      );
    }
  }

  public override async stop() {
    await this.subscriptionService?.stop();
  }
}
