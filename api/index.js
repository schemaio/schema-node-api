const Schema = require('schema-client');

module.exports = (env, schema) => {
  const api = require('./router')();

  // Connect Schema
  schema = schema || new Schema.Client(
    env.SCHEMA_CLIENT_ID,
    env.SCHEMA_CLIENT_KEY
  );

  // v1 router
  const router1 = initRouter(env, schema, [
    './v1/account',
    './v1/cart',
    './v1/categories',
    './v1/contacts',
    './v1/pages',
    './v1/products',
    './v1/session',
    './v1/slug'
  ]);

  // Mount
  api.use('/v1', router1);

  return api;
};

// Helper to init routers
function initRouter(env, schema, modules) {
  const router = require('./router')();
  modules.forEach(module => {
    require(module).init(env, router, schema);
  });
  return router;
}
