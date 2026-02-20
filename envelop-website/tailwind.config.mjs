import config from '@theguild/tailwind-config';

export default {
  ...config,
  safelist: ['dark:invert'], // because `dark:invert` not in tsx file but in ts
};
