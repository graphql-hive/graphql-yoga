export default async () => {
  const { PLUGINS } = await import('../../lib/plugins');
  return Object.fromEntries(
    PLUGINS.map(({ identifier, title }) => [
      identifier,
      {
        title,
        theme: {
          layout: 'default',
          timestamp: false,
        },
      },
    ]),
  );
};
