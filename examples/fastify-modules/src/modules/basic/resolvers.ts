import { Resolvers } from 'graphql-modules';
import { BasicProvider } from './providers';

export const resolvers: Resolvers = {
  Query: {
    hello: () => 'world',
    contextKeys: (_: never, __: never, { injector }: GraphQLModules.AppContext) => {
      return injector.get(BasicProvider).getContextKeys();
    },
  },
  Subscription: {
    countdown: {
      subscribe(_: never, { from }: { from: number }, { injector }: GraphQLModules.AppContext) {
        return injector.get(BasicProvider).getCountdown(from);
      },
      resolve(countdown: number) {
        return { countdown };
      },
    },
  },
};
