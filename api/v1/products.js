const util = require('../util');
const cache = require('../cache');

const products = module.exports;

// Init routes
products.init = (env, router, schema) => {
  router.get('/products', cache(env), products.get.bind(this, schema));
  router.get('/products/:id', cache(env), products.getById.bind(this, schema));
};

// Get many products
products.get = (schema, req) => {
  if (req.query.category) {
    return products.getByCategory(schema, req);
  }
  return schema.get('/products', {
    where: products.defaultQuery(req)
  });
};

// Get one product
products.getById = (schema, req) => {
  return schema.get('/products/{id}', {
    id: req.params.id,
    where: products.defaultQuery(req)
  });
};

// Get products
products.getByCategory = (schema, req) => {
  return schema.get('/categories/{id}', {
    id: req.query.category,
    fields: 'id'
  }).then(category => {
    if (!category) {
      throw util.error(400, 'Category not found `' + req.query.category + '`');
    }
    return schema.get('/products', {
      'category_index.id': category.id,
      sort: 'category_index.sort.' + category.id,
      where: products.defaultQuery(req)
    });
  });
};

// Default query
products.defaultQuery = () => {
  active: true
};
