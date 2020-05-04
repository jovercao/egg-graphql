'use strict';

const path = require('path');
const { makeExecutableSchema } = require('graphql-tools');
const _ = require('lodash');
const { loadWithImport, resolveLocation, formatLocation } = require('./schema_loader');
const is = require('is-type-of');
const { makeSchemaDirective } = require('./util')

const SYMBOL_SCHEMA = Symbol('Applicaton#schema');

module.exports = app => {
  const basePath = path.join(app.baseDir, 'app/graphql');

  // ************************************ 加载connector *****************************************/
  const connector = {};
  app.loader.loadToContext(path.join(basePath, 'connector'), 'connector', {
    call: true,
    target: connector,
    fieldClass: 'connectorClasses',
  });

  // ************************************ 加载resolver *****************************************/
  const resolverMap = {};
  app.loader.loadToApp(path.join(basePath, 'resolver'), 'resolver', {
    target: resolverMap,
  });
  const resolvers = _.merge({}, ...Object.values(resolverMap));

  // ************************************ 加载directive *****************************************/
  const schemaDirectives = {};
  app.loader.loadToApp(path.join(basePath + 'directive'), 'directiveResolver', {
    target: schemaDirectives,
    filter: exports => is.class(exports),
    // 同时兼容directiveResolver函数写法
    initializer(exports) {
      if (typeof exports === 'function' && !is.class(exports)) {
        return makeSchemaDirective(exports);
      } else if (is.class(exports)) {
        return exports;
      }
    },
    call: true,
    fieldClass: 'schemaDirectiveClasses',
  });

  const loadedSchemaFile = loadWithImport(path.join(basePath, 'schema.gql'));
  const typeDefs = loadedSchemaFile.lines.join('\n');
  // ****************************** 增加报错位置显示 ***********************************
  Object.defineProperty(app, 'schema', {
    get() {
      if (!this[SYMBOL_SCHEMA]) {
        try {
          this[SYMBOL_SCHEMA] = makeExecutableSchema({
            typeDefs,
            resolvers,
            schemaDirectives,
          });
        } catch (ex) {
          let exForThrow;
          let locations;
          if (ex.locations) {
            locations = ex.locations.map(({ line, column }) => resolveLocation(loadedSchemaFile, line, column));
            const msg = '在加载schema时发生错误:\n  ' + ex.message + '\n'
              + locations.map((location, index) => `错误${index + 1}：\n${formatLocation(location)}`).join('\n');
            app.logger.error(msg);
            exForThrow = new Error(msg);
            exForThrow.locations = locations;
          } else {
            exForThrow = ex;
            // exForThrow.errLines = lines;
          }
          throw exForThrow;
        }
      }
      return this[SYMBOL_SCHEMA];
    },
  });
};
