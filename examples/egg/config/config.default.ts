import type { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (app: EggAppInfo): PowerPartial<EggAppConfig> => {
  return {
    keys: app.name + 'e_ege',

    security: {
      csrf: {
        enable: false,
      },
    },

    cors: {
      origin: '*',
      allowMethods: 'GET,PUT,POST,DELETE',
      credentials: true,
    },
  };
};
