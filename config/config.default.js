'use strict';

exports.graphql = {
  mountUrl: '/graphql',
  schemaFile: 'app/graphql/schema.gql',
  connectorDir: 'app/graphql/connector',
  resolverDir: 'app/graphql/resolver',
  directiveDir: 'app/graphql/directive',
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
