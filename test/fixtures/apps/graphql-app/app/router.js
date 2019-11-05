'use strict';

module.exports = function(app) {
  app.get('/user', async ctx => {
    ctx.body = await ctx.graphql.query(`{
      user(id: 2) {
        name
      }
    }`);
  });

  app.get('/framework', async ctx => {
    ctx.body = await ctx.graphql.query(`{
      framework(id: 2) {
        name
      }
    }`);
  });
};
