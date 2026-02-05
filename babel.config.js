export default {
  presets: [
    ['@babel/preset-env', { targets: { node: process.versions.node.split('.')[0] } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-transform-typescript-metadata',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    'babel-plugin-parameter-decorator',
    '@babel/plugin-transform-class-properties',
  ],
};
