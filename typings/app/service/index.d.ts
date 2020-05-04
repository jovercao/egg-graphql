// This file is created by egg-ts-helper@1.25.6
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportGraphql = require('../../../app/service/graphql');

declare module 'egg' {
  interface IService {
    graphql: ExportGraphql;
  }
}
