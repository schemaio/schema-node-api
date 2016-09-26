const cache = require('../cache');

const pages = module.exports;

// Init routes
pages.init = (env, router, schema) => {
  router.get('/pages/:id', cache(env), pages.getById.bind(this, schema));
  router.get('/pages/:id/articles', cache(env), pages.getArticles.bind(this, schema));
  router.get('/pages/:id/articles/:article_id', cache(env), pages.getArticlesById.bind(this, schema));
};

// Get page by ID
pages.getById = (schema, req) => {
  return schema.get('/pages/{id}', {
    id: req.params.id,
    where: pages.defaultQuery(req),
    include: req.query.include === 'articles' ? {
      articles: {
        url: '/pages:articles',
        params: {
          parent_id: 'id'
        },
        data: pages.defaultQuery(req)
      }
    } : null
  });
};

// Get page articles
pages.getArticles = (schema, req) => {
  return schema.get('/pages/{id}/articles', {
    id: req.params.id,
    where: pages.defaultQuery(req),
  });
};

// Page page article by ID
pages.getArticlesById = (schema, req) => {
  return schema.get('/pages/{id}/articles/{article_id}', {
    id: req.params.id,
    article_id: req.params.article_id,
    where: pages.defaultQuery(req),
  });
};

// Default query
pages.defaultQuery = () => {
  $or: [{
    date_published: null
  }, {
    date_published: {
      $lt: Date.now()
    }
  }]
};
