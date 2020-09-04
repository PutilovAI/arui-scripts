const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const configs = require('./app-configs');

const extensions = ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx', '.ts', '.tsx'];

module.exports = {
    alias: {
        'react-dom': '@hot-loader/react-dom',
    },
    // This allows you to set a fallback for where Webpack should look for modules.
    // We placed these paths second because we want `node_modules` to "win"
    // if there are any conflicts. This matches Node resolution mechanism.
    // https://github.com/facebookincubator/create-react-app/issues/253
    modules: ['node_modules', configs.appNodeModules],
    // These are the reasonable defaults supported by the Node ecosystem.
    // We also include JSX as a common component filename extension to support
    // some tools, although we do not recommend using it, see:
    // https://github.com/facebookincubator/create-react-app/issues/290
    // `web` extension prefixes have been added for better support
    // for React Native Web.
    extensions,
    plugins: [
        (configs.tsconfig && new TsconfigPathsPlugin({
            configFile: configs.tsconfig,
            extensions
        }))
    ].filter(Boolean),
}
