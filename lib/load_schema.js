'use strict';

const fs = require('fs');
const path = require('path');
const {
  makeExecutableSchema,
} = require('graphql-tools');
const _ = require('lodash');

const SYMBOL_SCHEMA = Symbol('Applicaton#schema');
const util = require('./util');

function compileWithImport(file) {
  const dir = path.dirname(file);
  return fs.readFileSync(file, { encoding: 'utf8' })
    .toString()
    .replace(/( *)#import (.+)/g, s => {
      const [, indent, file] = /( *)#import (.+)/.exec(s);
      const importFile = path.resolve(dir, file);
      const txt = compileWithImport(importFile);
      return txt
        .split('\n')
        .map(line => indent + line)
        .join('\n');
    });
}

module.exports = app => {
  const basePath = path.join(app.baseDir, 'app/graphql');
  const types = util.walk(basePath, basePath);

  const schemas = [];
  const resolverMap = {};
  const resolverFactories = [];
  const directiveMap = {};
  const schemaDirectivesProps = {};
  const { defaultEmptySchema = false } = app.config.graphql;
  const defaultSchema = `
    type Query 
    type Mutation 
  `;
  if (defaultEmptySchema) {
    schemas.push(defaultSchema);
  }
  types.forEach(type => {
    // Load schema
    const schemaFile = path.join(basePath, type, 'schema.graphql');
    /* istanbul ignore else */
    if (fs.existsSync(schemaFile)) {
      const schema = compileWithImport(schemaFile)
      schemas.push(schema);
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

  Object.defineProperty(app, 'schema', {
    get() {
      if (!this[SYMBOL_SCHEMA]) {
        resolverFactories.forEach(resolverFactory => _.merge(resolverMap, resolverFactory(app)));
        const lines = [].concat(...schemas.map(p => p.split('\n')));
        try {
          this[SYMBOL_SCHEMA] = makeExecutableSchema({
            typeDefs: lines.join('\n'),
            resolvers: resolverMap,
            directiveResolvers: directiveMap,
            schemaDirectives: schemaDirectivesProps,
          });
        } catch (ex) {
          let exForThrow;
          if (ex.locations) {
            const errLine = ex.locations[0].line;
            const startLine = errLine - 2;
            const msg = '在加载schema时发生了错误：\n' + ex.message + `\n 在 ${errLine}行， ${ex.locations[0].line}列：`;
            const errLines = lines.slice(startLine, startLine + 5).map((line, index) => [ startLine + index, line ]);

            exForThrow = new Error(msg);
            exForThrow.errLines = errLines;
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
