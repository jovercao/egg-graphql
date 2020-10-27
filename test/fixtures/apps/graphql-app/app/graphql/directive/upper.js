'use strict';

const { defaultFieldResolver } = require('graphql');
const { SchemaDirectiveVisitor } = require('graphql-tools');

module.exports = () => {
  return class UpperDriective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
      const resolve = field.resolve || defaultFieldResolver;
      field.resolve = async function(...args) {
        const str = await resolve.call(this, ...args);
        if (typeof str === 'string') {
          return str.toUpperCase();
        }
        return str;
      };
    }
  };
};
