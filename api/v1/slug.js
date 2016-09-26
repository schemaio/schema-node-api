const util = require('../util');
const cache = require('../cache');
const pages = require('./pages');
const products = require('./products');
const categories = require('./categories');

const slug = module.exports;

// Init routes
slug.init = (env, router, schema) => {
  router.get('/slug/:id*', cache(env), slug.get.bind(this, schema));
};

// Find a resource by slug in order of priority
slug.get = (schema, req) => {
  // Sub category /can/be/nested
  if (req.params[0].length) {
    req.params.id = req.params[0].split('/').pop();
    return categories.getById(schema, req).then(result => {
      return slug.response('category', result);
    });
  }
  // Page
  return pages.getById(schema, req).then(result => {
    if (result) {
      return slug.response('page', result);
    }
    // Product
    return products.getById(schema, req).then(result => {
      if (result) {
        return slug.response('product', result);
      }
      // Category
      return categories.getById(schema, req).then(result => {
        if (result) {
          return slug.response('category', result);
        }
        // Not found
        return null;
      });
    });
  });
};

// Prepare slug response
slug.response = (type, result) => {
  if (result && result.toObject) {
    return { type: type, data: result.toObject() };
  }
};
