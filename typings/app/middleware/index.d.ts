// This file is created by egg-ts-helper@1.25.6
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportGraphql = require('../../../app/middleware/graphql');

declare module 'egg' {
  interface IMiddleware {
    graphql: typeof ExportGraphql;
  }
}
