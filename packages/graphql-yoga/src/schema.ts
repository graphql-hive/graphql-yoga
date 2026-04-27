import type { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLSchemaWithContext, YogaInitialContext } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createSchema<TContext = {}>(
  opts: IExecutableSchemaDefinition<TContext & YogaInitialContext>,
): GraphQLSchemaWithContext<TContext & YogaInitialContext> {
  return makeExecutableSchema<TContext & YogaInitialContext>(opts);
}
