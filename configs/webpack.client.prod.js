const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const configs = require('./app-configs');
const babelConf = require('./babel-client');
const postcssConf = require('./postcss');
const applyOverrides = require('./util/apply-overrides');
const checkNodeVersion = require('./util/check-node-version');
const getEntry = require('./util/get-entry');

const noopPath = require.resolve('./util/noop');

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;

function getSingleEntry(entryPoint) {
    return [configs.clientPolyfillsEntry, ...entryPoint].filter(Boolean);
}

// This is the production configuration.
module.exports = applyOverrides(['webpack', 'webpackClient', 'webpackProd', 'webpackClientProd'], {
    mode: 'production',
    // You may want 'eval' instead if you prefer to see the compiled output in DevTools.
    devtool: 'cheap-module-source-map',
    // In production, we only want to load the polyfills and the app code.
    entry: getEntry(configs.clientEntry, getSingleEntry),
    bail: true,
    context: configs.cwd,
    output: {
        pathinfo: false,
        path: configs.clientOutputPath,
        publicPath: configs.publicPath,
        filename: '[name].[chunkhash:8].js',
        chunkFilename: '[name].[chunkhash:8].chunk.js',
        // Point sourcemap entries to original disk location (format as URL on Windows)
        devtoolModuleFilenameTemplate: info =>
            path
                .relative(configs.appSrc, info.absoluteResourcePath)
                .replace(/\\/g, '/'),
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    chunks: "initial",
                    minChunks: 2,
                    maxInitialRequests: 5, // The default limit is too small to showcase the effect
                    minSize: 0 // This is example is too small to create commons chunks
                },
                vendor: {
                    test: /node_modules/,
                    chunks: "initial",
                    name: "vendor",
                    priority: 10,
                    enforce: true
                }
            }
        },
        minimize: true,
        minimizer: [
            // This is only used in production mode
            new TerserPlugin({
                terserOptions: {
                    parse: {
                        // we want terser to parse ecma 8 code. However, we don't want it
                        // to apply any minfication steps that turns valid ecma 5 code
                        // into invalid ecma 5 code. This is why the 'compress' and 'output'
                        // sections only apply transformations that are ecma 5 safe
                        // https://github.com/facebook/create-react-app/pull/4234
                        ecma: 8,
                    },
                    compress: {
                        ecma: 5,
                        warnings: false,
                        // Disabled because of an issue with Uglify breaking seemingly valid code:
                        // https://github.com/facebook/create-react-app/issues/2376
                        // Pending further investigation:
                        // https://github.com/mishoo/UglifyJS2/issues/2011
                        comparisons: false,
                        // Disabled because of an issue with Terser breaking valid code:
                        // https://github.com/facebook/create-react-app/issues/5250
                        // Pending futher investigation:
                        // https://github.com/terser-js/terser/issues/120
                        inline: 2,
                    },
                    mangle: {
                        safari10: true,
                    },
                    output: {
                        ecma: 5,
                        comments: false,
                        // Turned on because emoji and regex is not minified properly using default
                        // https://github.com/facebook/create-react-app/issues/2488
                        ascii_only: true,
                    },
                },
                // Use multi-process parallel running to improve the build speed
                // Default number of concurrent runs: os.cpus().length - 1
                parallel: true,
                // Enable file caching
                cache: true,
                sourceMap: true,
            })
        ],
    },
    resolve: {
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
        extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx', '.ts', '.tsx'],
        plugins: [
            (configs.tsconfig && new TsconfigPathsPlugin({
                configFile: configs.tsconfig,
                extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx', '.ts', '.tsx']
            }))
        ].filter(Boolean),
    },
    module: {
        // typescript interface will be removed from modules, and we will get an error on correct code
        // see https://github.com/webpack/webpack/issues/7378
        strictExportPresence: !configs.tsconfig,
        rules: [
            {
                // "oneOf" will traverse all following loaders until one will
                // match the requirements. When no loader matches it will fall
                // back to the "file" loader at the end of the loader list.
                oneOf: [
                    // "url" loader works like "file" loader except that it embeds assets
                    // smaller than specified limit in bytes as data URLs to avoid requests.
                    // A missing `test` is equivalent to a match.
                    {
                        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
                        loader: require.resolve('url-loader'),
                        options: {
                            limit: 10000,
                            name: '[name].[hash:8].[ext]',
                        },
                    },
                    // Process JS with Babel.
                    {
                        test: configs.useTscLoader ? /\.(js|jsx|mjs)$/ : /\.(js|jsx|mjs|ts|tsx)$/,
                        include: configs.appSrc,
                        loader: require.resolve('babel-loader'),
                        options: babelConf,
                    },
                    (configs.tsconfig && configs.useTscLoader) && {
                        test: /\.tsx?$/,
                        use: [
                            {
                                loader: require.resolve('babel-loader'),
                                options: Object.assign({
                                    // This is a feature of `babel-loader` for webpack (not Babel itself).
                                    // It enables caching results in ./node_modules/.cache/babel-loader/
                                    // directory for faster rebuilds.
                                    cacheDirectory: true
                                }, babelConf)
                            },
                            {
                                loader: require.resolve('cache-loader')
                            },
                            {
                                loader: require.resolve('ts-loader'),
                                options: {
                                    onlyCompileBundledFiles: true,
                                    happyPackMode: true,
                                    configFile: configs.tsconfig
                                }
                            }
                        ]
                    },
                    // The notation here is somewhat confusing.
                    // "postcss" loader applies autoprefixer to our CSS.
                    // "css" loader resolves paths in CSS and adds assets as dependencies.
                    // "style" loader normally turns CSS into JS modules injecting <style>,
                    // but unlike in development configuration, we do something different.
                    // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
                    // (second argument), then grabs the result CSS and puts it into a
                    // separate file in our build process. This way we actually ship
                    // a single CSS file in production instead of JS code injecting <style>
                    // tags. If you use code splitting, however, any async bundles will still
                    // use the "style" loader inside the async code so CSS from them won't be
                    // in the main CSS file.
                    {
                        test: cssRegex,
                        exclude: cssModuleRegex,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                                options: { publicPath: './' }
                            },
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 1,
                                    sourceMap: false,
                                },
                            },
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    // Necessary for external CSS imports to work
                                    // https://github.com/facebookincubator/create-react-app/issues/2677
                                    ident: 'postcss',
                                    plugins: () => postcssConf,
                                },
                            },
                        ],
                    },
                    {
                        test: cssModuleRegex,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                                options: { publicPath: './' }
                            },
                            {
                                loader: require.resolve('css-loader'),
                                options: {
                                    importLoaders: 1,
                                    modules: true,
                                    sourceMap: false,
                                    getLocalIdent: getCSSModuleLocalIdent
                                },
                            },
                            {
                                loader: require.resolve('postcss-loader'),
                                options: {
                                    // Necessary for external CSS imports to work
                                    // https://github.com/facebookincubator/create-react-app/issues/2677
                                    ident: 'postcss',
                                    plugins: () => postcssConf,
                                },
                            },
                        ],
                    },
                    // "file" loader makes sure those assets get served by WebpackDevServer.
                    // When you `import` an asset, you get its (virtual) filename.
                    // In production, they would get copied to the `build` folder.
                    // This loader doesn't use a "test" so it will catch all modules
                    // that fall through the other loaders.
                    {
                        // Exclude `js` files to keep "css" loader working as it injects
                        // its runtime that would otherwise processed through "file" loader.
                        // Also exclude `html` and `json` extensions so they get processed
                        // by webpacks internal loaders.
                        exclude: [/\.(js|jsx|mjs|ts|tsx)$/, /\.(html|ejs)$/, /\.json$/],
                        loader: require.resolve('file-loader'),
                        options: {
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ].filter(Boolean),
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
        ],
    },
    plugins: [
        new AssetsPlugin({ path: configs.serverOutputPath }),
        // Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css',
            chunkFilename: '[name].[contenthash:8].chunk.css',
        }),
        new ManifestPlugin(),
        new OptimizeCssAssetsPlugin({
            cssProcessorOptions: {
                reduceIdents: {
                    keyframes: false
                },
                zindex: false
            }
        }),
        new CompressionPlugin({
            filename: '[file].gz',
            algorithm: 'gzip',
            test: /\.js$|\.css$|\.png$|\.svg$/,
            threshold: 10240,
            minRatio: 0.8
        }),
        checkNodeVersion(10) && new CompressionPlugin({
            filename: '[file].br',
            algorithm: 'brotliCompress',
            test: /\.(js|css|html|svg)$/,
            compressionOptions: {
                level: 11,
            },
            threshold: 10240,
            minRatio: 0.8,
        }),
        configs.tsconfig !== null && new ForkTsCheckerWebpackPlugin(),
    ].filter(Boolean).concat(
        // Ignore prop-types packages in production mode
        // This should works fine, since proptypes usage should be eliminated in production mode
        configs.keepPropTypes
            ? []
            : [
                new webpack.NormalModuleReplacementPlugin(
                    /^react-style-proptype$/,
                    noopPath
                ),
                new webpack.NormalModuleReplacementPlugin(
                    /^thrift-services\/proptypes/,
                    noopPath
                )
            ]
    ),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    // node: {
    //     global: {
    //         dgram: false,
    //         fs: false,
    //         net: false,
    //         tls: false,
    //         child_process: false,
    //     }
    // },
});
