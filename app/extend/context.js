'use strict';

const SYMBOL_CONNECTOR = Symbol('connector');

let connectorMapps;

module.exports = {

  /**
   * connector instance
   * @member Context#connector
   */

  get connector() {
    /* istanbul ignore else */
    if (!this[SYMBOL_CONNECTOR]) {
      if (!connectorMapps) {
        connectorMapps = {};
        for (const [ key, value ] of this.app.connectorClass) {
          connectorMapps[key] = value;
        }
      }
      // const connectors = {};
      // for (const [ type, Class ] of this.app.connectorClass) {
      //   connectors[type] = new Class(this);
      // }
      // this[SYMBOL_CONNECTOR] = connecotrs;
      this[SYMBOL_CONNECTOR] = new Proxy({}, {
        get: (target, name) => {
          if (!target[name] && connectorMapps[name]) {
            const Class = connectorMapps[name];
            target[name] = new Class(this);
          }
          return target[name];
        },
      });
    }
    return this[SYMBOL_CONNECTOR];
  },

  /**
   * graphql instance access
   * @member Context#graphql
   */

  get graphql() {
    return this.service.graphql;
  },
};
