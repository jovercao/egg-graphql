'use strict';

const fs = require('fs');
const path = require('path');
const {
  makeExecutableSchema,
} = require('graphql-tools');
const _ = require('lodash');

const SYMBOL_SCHEMA = Symbol('Applicaton#schema');
const util = require('./util');

const patter = /( *)#import (.+)/;

function loadWithImport(file) {
  const dir = path.dirname(file);
  const lines = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');
  const mapps = [];

  let index = 0;
  while (index < lines.length) {
    const mattched = patter.exec(lines[index]);
    if (mattched) {
      const [ , indent, file ] = mattched;
      const importFile = path.resolve(dir, file);
      const child = loadWithImport(importFile);
      lines.splice(index, 1, ...child.lines).map(ln => indent + ln);
      // 行号在索引号的基础 + 1
      const start = index + 1;
      index += child.lines.length;
      const end = start + child.lines.length - 1;
      mapps.push({
        indent,
        start,
        end,
        path: importFile,
      });
    }
    index++;
  }
  return {
    lines,
    mapps,
  };
}

module.exports = app => {
  const basePath = path.join(app.baseDir, 'app/graphql');
  const types = util.walk(basePath, basePath);

  const schemaLines = [];
  const resolverMap = {};
  const resolverFactories = [];
  const directiveMap = {};
  const schemaDirectivesProps = {};
  // const { defaultEmptySchema = false } = app.config.graphql;
  // const defaultSchema = `
  //   type Query
  //   type Mutation
  // `;
  // if (defaultEmptySchema) {
  //   schemas.push(defaultSchema);
  // }
  const mapps = [];

  // ****************************** 增加报错位置显示 ***********************************
  types.forEach(type => {
    // Load schema
    const schemaFile = path.join(basePath, type, 'schema.graphql');
    /* istanbul ignore else */
    if (fs.existsSync(schemaFile)) {
      const item = loadWithImport(schemaFile);
      item.path = schemaFile;
      item.start = schemaLines.length + 1;
      schemaLines.push(...item.lines);
      item.end = schemaLines.length;
      mapps.push(item);
    }

    // Load resolver
    const resolverFile = path.join(basePath, type, 'resolver.js');
    if (fs.existsSync(resolverFile)) {
      const resolver = require(resolverFile);
      if (_.isFunction(resolver)) {
        resolverFactories.push(resolver);
      } else if (_.isObject(resolver)) {
        _.merge(resolverMap, resolver);
      }
    }

    // Load directive resolver
    const directiveFile = path.join(basePath, type, 'directive.js');
    if (fs.existsSync(directiveFile)) {
      const directive = require(directiveFile);
      _.merge(directiveMap, directive);
    }

    // Load schemaDirectives
    let schemaDirectivesFile = path.join(basePath, type, 'schemaDirective.js');
    if (fs.existsSync(schemaDirectivesFile)) {
      schemaDirectivesFile = require(schemaDirectivesFile);
      _.merge(schemaDirectivesProps, schemaDirectivesFile);
    }
  });

  /**
   * 解析代码所在文件
   * @param {*} mapps 代码映射
   * @param {*} line 行号
   * @param {*} column 列号
   * @param {*} path 当前路径
   * @param {*} from 父级文件信息，格式与返回结果格式一致
   * @return {*} 返回 { path, line, column, from } 格式
   */
  function resolveLocation(mapps, line, column, path, from) {
    const initLine = line;
    mapps = mapps || [];
    // 要路过的子模块总行数
    const importLines = mapps.filter(p => p.end < initLine)
      .reduce((total, current) => total + (current.end - current.start), 0);
    // 转换行号，当前文件错误所在行号
    line -= importLines;
    const self = {
      path,
      line,
      column,
      from,
    };

    if (from) {
      from.line - initLine;
    }
  
    // 错误所在的子模块
    const item = mapps.find(({ start, end }) => initLine >= start && initLine <= end);

    if (!item) return self;
 
    let subColumn = column;
    // 转换列号
    if (item.ident) {
      subColumn -= item.ident.length;
    }
    // 转换子模块行号
    const subLine = initLine - item.start + 1;
    self.line = item.start - importLines;
    return resolveLocation(item.mapps, subLine, subColumn, item.path, self);
  }

  function formatLocation({ path, line, column, from }) {
    let txt = `  at ${path || ''}:${line}:${column}\n`;
    if (from && from.path) {
      txt += formatLocation(from);
    }
    return txt;
  }

  Object.defineProperty(app, 'schema', {
    get() {
      if (!this[SYMBOL_SCHEMA]) {
        resolverFactories.forEach(resolverFactory => _.merge(resolverMap, resolverFactory(app)));
        try {
          this[SYMBOL_SCHEMA] = makeExecutableSchema({
            typeDefs: schemaLines.join('\n'),
            resolvers: resolverMap,
            directiveResolvers: directiveMap,
            schemaDirectives: schemaDirectivesProps,
          });
        } catch (ex) {
          let exForThrow;
          let locations;
          if (ex.locations) {
            locations = ex.locations.map(({ line, column }) => resolveLocation(mapps, line, column));
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
