'use strict';

exports.graphql = {
  router: '/graphql',
  debug: false,
  tracing: false,
  logOnExecute: true,
  logOnError: true,
  cache: {
    enabled: false,
    type: 'memcached',
    hosts: [
      '127.0.0.1',
    ],
  },
};
