import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchemaWithContext, YogaInitialContext } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createSchema<TContext = {}>(
  opts: IExecutableSchemaDefinition<TContext & YogaInitialContext>,
): GraphQLSchemaWithContext<TContext & YogaInitialContext> {
  return makeExecutableSchema<TContext & YogaInitialContext>(opts);
}
