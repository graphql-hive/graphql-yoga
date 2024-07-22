import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import type { ServerAdapterInitialContext } from '@whatwg-node/server';
import { GraphQLSchemaWithContext, YogaInitialContext } from './types.js';

// eslint-disable-next-line @typescript-eslint/ban-types
export function createSchema<TContext = {}>(
  opts: IExecutableSchemaDefinition<TContext & YogaInitialContext>,
): GraphQLSchemaWithContext<TContext & YogaInitialContext & ServerAdapterInitialContext> {
  return makeExecutableSchema<TContext & YogaInitialContext & ServerAdapterInitialContext>(opts);
}
