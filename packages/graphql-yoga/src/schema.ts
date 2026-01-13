import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchemaWithContext, YogaInitialContext } from '@graphql-yoga/types';

export function createSchema<TContext = {}>(
  opts: IExecutableSchemaDefinition<TContext & YogaInitialContext>,
): GraphQLSchemaWithContext<TContext & YogaInitialContext> {
  return makeExecutableSchema<TContext & YogaInitialContext>(opts);
}
