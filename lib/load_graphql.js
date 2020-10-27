'use strict';

const path = require('path');
const fs = require('fs');
const { makeExecutableSchema } = require('graphql-tools');
const _ = require('lodash');
const { loadSchemaFile, resolveLocation, formatLocation } = require('./schema_loader');
const is = require('is-type-of');
const SYMBOL_GRAPHQL = Symbol('Applicaton#graphql');

// 过滤掉 .*.js 或者 .*.ts
const match = (process.env.EGG_TYPESCRIPT === 'true')
  ? ['**/!(*.(ex|base)).(js|ts)', '!**/*.d.ts']
  : ['**/!(*.(ex|base)).js'];

module.exports = app => {
  // ************************************ 加载connector *****************************************/
  const connectorDirPath = path.resolve(app.baseDir, app.config.graphql.connectorDir);
  app.loader.loadToContext(connectorDirPath, 'connector', {
    call: true,
    match,
    fieldClass: 'connectorClasses',
    filter: exports => is.class(exports),
  });

  // ************************************ 加载resolver *****************************************/
  const resolverDirPath = path.resolve(app.baseDir, app.config.graphql.resolverDir);
  const loadedResolver = {};
  new app.loader.FileLoader({
    directory: resolverDirPath,
    match,
    inject: app,
    // 所有内容导入到同一级别下
    caseStyle(filePath) {
      return [filePath];
    },
    call: true,
    target: loadedResolver,
  }).load();
  // app.loader.loadToApp(resolverDirPath, 'resolver', {
  //   match,
  //   target: resolverMap,
  // });
  const resolvers = _.merge({}, ...Object.values(loadedResolver));
  Object.defineProperty(app, 'resolver', {
    get() {
      return resolvers;
    },
  });

  // ************************************ 加载directive *****************************************/
  const directiveDirPath = path.resolve(app.baseDir, app.config.graphql.directiveDir);
  const schemaDirectives = {};
  // app.loader.loadToApp(directiveDirPath, 'directiveResolver', {
  //   target: schemaDirectives,
  //   // 不改变文件大小写规则
  //   camelStyle: 'camel',
  //   match,
  //   // 同时兼容directiveResolver函数写法
  //   initializer(exports) {
  //     if (typeof exports === 'function' && !is.class(exports)) {
  //       return makeSchemaDirectiveClass(exports);
  //     } else if (is.class(exports)) {
  //       return exports;
  //     }
  //   },
  //   call: true,
  //   fieldClass: 'schemaDirectiveClasses',
  // });
  new app.loader.FileLoader({
    directory: directiveDirPath,
    target: schemaDirectives,
    // inject: app,
    // 不改变文件大小写规则
    camelStyle(filePath) {
      const property = path.basename(filePath);
      return [
        property,
      ];
    },
    call: true,
    match,
    // 同时兼容directiveResolver函数写法
    initializer(exports) {
      if (typeof exports === 'function') {
        if (!is.class(exports)) {
          const res = exports(app);
          if (!is.class(res)) {
            throw new Error('graphql指令声明只能是继承于SchemaDirective的class。');
          }
          return res;
        }
        return exports;
      }
      throw new Error('graphql指令声明只能是继承于SchemaDirective的class。');
    },
  }).load();

  // ************************************ 加载schema.gql文件 *****************************************/
  const schemaFilePath = path.resolve(app.baseDir, app.config.graphql.schemaFile);
  if (!fs.existsSync(schemaFilePath)) {
    throw new Error(`Graphql类型文件${schemaFilePath}未找到！`);
  }
  const schemaFile = loadSchemaFile(schemaFilePath);
  const typeDefs = schemaFile.lines.join('\n');

  // ****************************** 增加报错位置显示 ***********************************
  Object.defineProperty(app, 'graphql', {
    get() {
      if (!this[SYMBOL_GRAPHQL]) {
        try {
          const schema = makeExecutableSchema({
            typeDefs,
            resolvers,
            schemaDirectives,
          });
          this[SYMBOL_GRAPHQL] = {
            get schema() {
              return schema;
            },
            get resolver() {
              return resolvers;
            },
          };
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
      return this[SYMBOL_GRAPHQL];
    },
  });
};
