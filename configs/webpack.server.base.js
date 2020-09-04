const path = require('path');
const nodeExternals = require('webpack-node-externals');

const configs = require('./app-configs');
const resolvers = require('./resolvers');

// This is the development configuration.
// It is focused on developer experience and fast rebuilds.
// The production configuration is different and lives in a separate file.
module.exports = {
    target: 'node',
    node: {
        __filename: true,
        __dirname: true
    },
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // The first two entry points enable "hot" CSS and auto-refreshes for JS.
    entry: [
        // Finally, this is your app's code:
        configs.serverEntry,
        // We include the app code last so that if there is a runtime error during
        // initialization, it doesn't blow up the WebpackDevServer client, and
        // changing JS code would still trigger a refresh.
    ],
    context: configs.cwd,
    output: {
        // Add /* filename */ comments to generated require()s in the output.
        pathinfo: true,
        path: configs.serverOutputPath,
        publicPath: configs.publicPath,
        filename: configs.serverOutput,
        chunkFilename: '[name].js',
        // Point sourcemap entries to original disk location (format as URL on Windows)
        devtoolModuleFilenameTemplate: info =>
            path
                .relative(configs.appSrc, info.absoluteResourcePath)
                .replace(/\\/g, '/'),
    },
    externals: [nodeExternals({
        allowlist: [
            /^arui-feather/,
            /^arui-ft-private/,
            /^arui-private/,
            /^alfaform-core-ui/,
            /^newclick-components/,
            /^newclick-composite-components/,
            /^#/,
            /^@alfalab\/icons/,
            /^@alfalab\/core-components/
        ]
    })],
    resolve: { ...resolvers }
};
