'use strict';

const fs = require('fs');
const path = require('path');
const { SchemaDirectiveVisitor, defaultFieldResolver } = require('graphql-tools');

module.exports = {
  makeSchemaDirective(resolver) {
    return class extends SchemaDirectiveVisitor {
      visitFieldDefinition(field) {
        const originalResolver = field.resolve || defaultFieldResolver;
        const directiveArgs = this.args;
        field.resolve = (...args) => {
          const [source, /* original args */, context, info] = args;
          return resolver(
            async () => originalResolver.apply(field, args),
            source,
            directiveArgs,
            context,
            info
          );
        };
      }
    };
  },

  getProperty(filepath, suffix) {
    const properties = filepath.substring(0, filepath.lastIndexOf('.')).split('/');
    // 如果符合尾词命名格式 a/b/c/connector.js，则按 a/b/c 解析
    if (properties[properties.length - 1].toLowerCase() === suffix.toLowerCase()) {
      properties.splice(properties.length - 1, 1);
    }
    return properties.map(property => {
      if (!/^[a-z][a-z0-9_-]*$/i.test(property)) {
        throw new Error(`${property} is not match 'a-z0-9_-' in ${filepath}`);
      }
      property = property.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
      property = property[0].toLowerCase() + property.substring(1);
      return [ property ];
    });
  },
};
