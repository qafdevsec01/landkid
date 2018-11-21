import * as express from 'express';
// import * as morgan from 'morgan';
import * as findUp from 'find-up';

import { Config } from './types';
import * as bodyParser from 'body-parser';

import { initializeSequelize } from './db';

import { LandRequestQueue } from './Queue';
import { Runner } from './Runner';
import { routes } from './routes';
import { BitbucketClient } from './bitbucket/BitbucketClient';
// import History from './History';

module.exports = async function atlaskid(config: Config) {
  await initializeSequelize();

  const server = express();
  // If we are in dev mode we'll use the webpack dev server, if not we'll be using the built static
  // files in dist/[legacy|modern]/static. Routing for this is in ./routes.js
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  ) {
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackConfigPath = findUp.sync('webpack.config.js', {
      cwd: __dirname,
    });
    if (!webpackConfigPath) {
      console.error(
        'Failed to find webpack config, please create one or blame luke',
      );
      process.exit(1);
      return;
    }
    const webpackConfig = require(webpackConfigPath);
    const webpackCompiler = webpack(webpackConfig);

    server.use(
      webpackDevMiddleware(webpackCompiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: {
          colors: true,
        },
      }),
    );
  }
  const { usersAllowedToApprove, allowLandWhenAble } = config.prSettings;
  server.use(bodyParser.json());
  // These are settings that we need passed into routes/ because they need to be passed to the front
  // end.
  // TODO: Find a nicer way to do this
  server.set('baseUrl', config.baseUrl);
  server.set('usersAllowedToMerge', usersAllowedToApprove);
  server.set('allowLandWhenAble', allowLandWhenAble);
  if (config.repoConfig.repoUuid) {
    server.set('repoUuid', config.repoConfig.repoUuid);
  }

  const client = new BitbucketClient(config);
  // let history = new History();

  const queue = new LandRequestQueue();
  const runner = new Runner(queue, client, config);

  try {
    routes(server, client, runner);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  return server;
};