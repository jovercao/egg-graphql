'use strict';

// Notice that this path is totally changed, because this function isn't
// directly exposed to the public, now we must still use that for the middle-
// ware.
const { graphqlKoa } = require('apollo-server-koa/dist/koaApollo');

// This has been newly imported, because in v2 of apollo-server, this is removed.
const { resolveGraphiQLString } = require('apollo-server-module-graphiql');

module.exports = (_, app) => {
  const options = app.config.graphql;

  let cache;
  if (options.cache.enabled) {
    switch (options.cache.type) {
      case 'memcached':
        cache = new (require('apollo-server-cache-memcached').MemcachedCache)();
        break;
      case 'redis':
        cache = new (require('apollo-server-cache-redis').MemcachedCache)();
        break;
      default:
        throw new Error('Not support cache type');
    }
  }

  return async (ctx, next) => {
    /* istanbul ignore else */
    if (ctx.path !== options.mountUrl) {
      return next();
    }
    if (ctx.request.accepts([ 'json', 'html' ]) === 'html' && options.graphiql !== false) {
      if (options.onPreGraphiQL) {
        await options.onPreGraphiQL(ctx);
      }
      const query = ctx.request.query;
      ctx.body = await resolveGraphiQLString(query, { endpointURL: options.mountUrl }, ctx);
      ctx.set('Content-Type', 'text/html');
      return;
    }
    if (options.onPreGraphQL) {
      await options.onPreGraphQL(ctx);
    }
    const formatError = options.logOnError && (error => {
      ctx.logger.error(error);
      return error;
    });
    const formatResponse = options.logOnExecute && (reponse => {
      ctx.logger.info(reponse);
      return reponse;
    });
    return graphqlKoa({
      schema: app.schema,
      context: ctx,
      debug: options.debug,
      tracing: options.tracing,
      cache,
      formatError,
      formatResponse,
    })(ctx);
  };
};
