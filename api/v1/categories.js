const Promise = require('bluebird');
const util = require('../util');
const cache = require('../cache');
const products = require('./products');

const categories = module.exports;

// Init routes
categories.init = (env, router, schema) => {
  router.get('/categories/:id', cache(env), categories.getById.bind(this, schema));
  router.get('/categories/:id/children', cache(env), categories.getChildren.bind(this, schema));
  router.get('/categories/:id/products', cache(env), categories.getAllProducts.bind(this, schema));
};

// Get category by ID
categories.getById = (schema, req) => {
  return schema.get('/categories/{id}', {
    id: req.params.id,
    where: categories.defaultQuery(req),
    sort: categories.defaultSort(req),
  });
};

// Get category children
categories.getChildren = (schema, req) => {
  return schema.get('/categories/{id}/children', {
    id: req.params.id,
    where: categories.defaultQuery(req),
    sort: categories.defaultSort(req),
    include: categories.filterIncludeQuery(req),
  });
};

// Get all nested category products
categories.getAllProducts = (schema, req) => {
  return schema.get('/categories/{id}', {
    id: req.params.id,
    fields: 'id'
  }).then(category => {
    if (!category) {
      return null;
    }
    return categories.getAllChildIdsRecursive(schema, req, [ category.id ]).then(allCategoryIds => {
      if (!allCategoryIds.length) {
        return null;
      }
      return schema.get('/products', {
        $or: allCategoryIds.map(categoryId => {
          return {
            'category_index.id': categoryId
          };
        }),
        where: products.defaultQuery(req),
      });
    });
  });
};

// Get child category IDs recursively
categories.getAllChildIdsRecursive = (schema, req, parentIds, ids) => {
  ids = ids || [];
  return schema.get('/categories', {
    id: { $in: parentIds },
    fields: 'id',
    where: categories.defaultQuery(req),
    sort: categories.defaultSort(req),
    include: {
      children: {
        url: '/categories',
        params: {
          parent_id: 'id'
        },
        data: {
          fields: 'id',
          limit: null
        }
      }
    }
  }).then(result => {
    if (!result || !result.results.length) {
      return ids;
    }
    return Promise.all(
      result.results.map(category => {
        ids.push(category.id);
        if (category.children.results.length) {
          const nextIds = category.children.results.map(child => child.id);
          return new Promise(resolve => {
            categories.getAllChildIdsRecursive(schema, req, nextIds, ids).then(resolve);
          });
        }
      })
    ).then(() => {
      return ids;
    });
  });
};

// Get a category

// Default query
categories.defaultQuery = (req) => {
  return {
    active: true,
    navigation: req.query.navigation || undefined,
  }
};

// Default sort
categories.defaultSort = (req) => {
  return {
    sort: 'sort ascending',
  }
};

// Filter include query for categories
categories.filterIncludeQuery = (req) => {
  let include = {};
  if (req.query.depth) {
    include = categories.filterIncludeQueryDepth(include, req);
  }
  return include;
};

// Filter depth query to include nested child categories
categories.filterIncludeQueryDepth = (include, req) => {
  // Depth query specifies how deep the children should fetch
  let depth = req.query.depth;
  if (depth > 1) {
    if (depth > 5) {
      throw util.error(400, 'Too much depth');
    }
    let deepInclude = include;
    while (--depth) {
      deepInclude.children = {};
      deepInclude.children.url = '/categories',
      deepInclude.children.params = { parent_id: 'id' };
      deepInclude.children.data = { include: {} };
      // Recursion here
      deepInclude = deepInclude.children.data.include;
    }
  }
  return include;
};
