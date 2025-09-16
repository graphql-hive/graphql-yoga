import type { EggApplication } from 'egg';
import { registerGraphqlRoute } from './graphql';

const initRouter = (app: EggApplication) => {
  const { router } = app;

  registerGraphqlRoute(router);
};

export default (app: any) => {
  initRouter(app);
};
