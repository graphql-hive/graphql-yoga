module.exports = {
  reactStrictMode: true,
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      graphql: require.resolve('graphql'),
    };
    return config;
  },
};
