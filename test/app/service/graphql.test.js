'use strict';

const assert = require('assert');
const mm = require('egg-mock');

describe('test/plugin.test.js', () => {
  let app;

  before(() => {
    app = mm.app({
      baseDir: 'apps/graphql-app',
    });
    return app.ready();
  });

  after(mm.restore);

  it('should return empty array', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{ projects }');
    assert.deepEqual(resp.data.projects, []);
  });

  it('should return user with no projects', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{ user(id: 3) { projects } }');
    assert.deepEqual(resp.data, { user: { projects: [] } });
  });

  it('should return error', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{}');
    assert.deepEqual(resp.data, {});
    assert.equal(resp.errors[0].message, 'Syntax Error: Expected Name, found }');
  });

  it('should return name\'s upperCase with @upper directive', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{ user(id: 1) { upperName } }');
    assert.deepEqual(resp.data, { user: { upperName: 'NAME1' } });
  });

  it('should return name\'s lowerCase with schemaDirectives', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{ user(id: 1) { lowerName } }');
    assert.deepEqual(resp.data, { user: { lowerName: 'name1' } });
  });

  it('should return framework with no projects', async () => {
    const ctx = app.mockContext();
    const resp = await ctx.graphql.query('{ framework(id: 3) { projects } }');
    assert.deepEqual(resp.data, { framework: { projects: [] } });
  });
});
