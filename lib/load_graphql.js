'use strict';

const path = require('path');
const fs = require('fs');
const { makeExecutableSchema } = require('graphql-tools');
const _ = require('lodash');
const { loadSchemaFile, resolveLocation, formatLocation } = require('./schema_loader');
const is = require('is-type-of');
const { makeSchemaDirectiveClass } = require('./util');

const SYMBOL_SCHEMA = Symbol('Applicaton#schema');

module.exports = app => {
  // ************************************ 加载connector *****************************************/
  const connectorDirPath = path.resolve(app.baseDir, app.config.graphql.connectorDir);
  app.loader.loadToContext(connectorDirPath, 'connector', {
    call: true,
    fieldClass: 'connectorClasses',
  });

  // ************************************ 加载resolver *****************************************/
  const resolverDirPath = path.resolve(app.baseDir, app.config.graphql.resolverDir);
  const resolverMap = {};
  app.loader.loadToApp(resolverDirPath, 'resolver', {
    target: resolverMap,
  });
  const resolvers = _.merge({}, ...Object.values(resolverMap));

  // ************************************ 加载directive *****************************************/
  const directiveDirPath = path.resolve(app.baseDir, app.config.graphql.directiveDir);
  const schemaDirectives = {};
  app.loader.loadToApp(directiveDirPath, 'directiveResolver', {
    target: schemaDirectives,
    // 不改变文件大小写规则
    camelStyle: 'camel',
    filter: exports => is.class(exports),
    // 同时兼容directiveResolver函数写法
    initializer(exports) {
      if (typeof exports === 'function' && !is.class(exports)) {
        return makeSchemaDirectiveClass(exports);
      } else if (is.class(exports)) {
        return exports;
      }
    },
    call: true,
    fieldClass: 'schemaDirectiveClasses',
  });

  // ************************************ 加载schema.gql文件 *****************************************/
  const schemaFilePath = path.resolve(app.baseDir, app.config.graphql.schemaFile);
  if (!fs.existsSync(schemaFilePath)) {
    throw new Error(`Graphql类型文件${schemaFilePath}未找到！`);
  }
  const schemaFile = loadSchemaFile(schemaFilePath);
  const typeDefs = schemaFile.lines.join('\n');
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
            locations = ex.locations.map(({ line, column }) => resolveLocation(schemaFile, line, column));
            const msg = '在加载schema时发生错误:\n  ' + ex.message + '\n'
              + locations.map((location, index) => `错误${index + 1}：\n${formatLocation(location)}`).join('\n');
            app.logger.error(msg);
            exForThrow = new Error(msg);
            exForThrow.locations = locations;
          } else {
            exForThrow = ex;
          }
          throw exForThrow;
        }
      }
      return this[SYMBOL_SCHEMA];
    },
  });
};
