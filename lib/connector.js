'use strict';

const { BaseContextClass } = require('egg');
// const { makeSingle } = require('../../functions')

class Connector extends BaseContextClass {
  get connector() {
    return this.ctx.connector;
  }

  get resolver() {
    return this.app.resolver;
  }
}

module.exports = Connector;

