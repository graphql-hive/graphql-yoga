import type { Router } from 'egg';
import { graphqlHandler } from './handler';

export const registerGraphqlRoute = (route: Router) => {
  route.all('/graphql', graphqlHandler);
};
