const _ = require('lodash');
const schema = Test.schemaClient();
const api = Test.apiClient(schema);

schema.expectCart = (props) => {
  schema.expects([
    {
      method: 'get',
      url: '/carts/{cart_id}',
      data: {
        cart_id: 123,
      },
      result: _.merge({ id: 123 }, props),
    },
  ]);
  return schema;
};

describe('/v1/cart', () => {
  schema.init();

  beforeEach(() => {
    schema.expectSession({
      cart_id: 123,
    });
  });

  describe('GET /v1/cart', () => {
    it('returns cart from session', () => {
      schema.expects([
        {
          method: 'get',
          url: '/carts/{id}',
          result: {
            id: 123,
          },
        },
      ]);
      return api.get('/v1/cart').then(result => {
        assert.deepEqual(result, {
          id: 123
        });
      });
    });

    it('returns null when cart is not created first', () => {
      schema.reset().expectSession().expects([
        {
          method: 'get',
          url: '/carts/{id}',
          result: null,
        }
      ]);
      return api.get('/v1/cart').then(result => {
        assert.isNull(result);
      });
    });
  });

  describe('PUT /v1/cart', () => {
    it('creates new cart if not existing', () => {
      schema.reset().expectSession().expects([
        {
          method: 'post',
          url: '/carts',
          result: {
            id: 123,
          },
        },
        {
          method: 'put',
          url: '/:sessions/{id}',
          data: {
            id: schema.sessionId,
            cart_id: 123,
          },
        },
        {
          method: 'put',
          url: '/carts/{cart_id}',
          data: {
            cart_id: 123,
            account_id: undefined,
            $promotions: true,
            shipping: { name: 'Test Customer' },
          },
          result: {
            id: 123,
            shipping: { name: 'Test Customer' },
          },
        },
      ]);
      return api.put('/v1/cart', {
        shipping: { name: 'Test Customer' },
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          shipping: { name: 'Test Customer' },
        });
      });
    });

    it('updates cart with items', () => {
      schema.expectCart();
      schema.expects([
        {
          method: 'put',
          url: '/carts/{cart_id}',
          data: {
            cart_id: 123,
            account_id: undefined,
            $promotions: true,
            items: [{
              product_id: 1,
              quantity: 2,
            }],
          },
          result: {
            id: 123,
            items: [{
              product_id: 1,
              quantity: 2,
            }],
          },
        },
      ]);
      return api.put('/v1/cart', {
        items: [{
          product_id: 1,
          quantity: 2,
        }],
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          items: [{
            product_id: 1,
            quantity: 2,
          }],
        });
      });
    });
  });

  describe('POST /v1/cart', () => {
    it('creates new cart if not existing', () => {
      schema.reset().expectSession().expects([
        {
          method: 'post',
          url: '/carts',
          result: {
            id: 123,
          }
        },
        {
          method: 'put',
          url: '/:sessions/{id}',
          data: {
            id: schema.sessionId,
            cart_id: 123
          },
        },
        {
          method: 'put',
          url: '/carts/{cart_id}',
          data: {
            cart_id: 123,
            account_id: undefined,
            $promotions: true,
            shipping: { name: 'Test Customer' },
          },
          result: {
            id: 123,
            shipping: { name: 'Test Customer' },
          },
        },
      ]);
      return api.post('/v1/cart', {
        shipping: { name: 'Test Customer' },
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          shipping: { name: 'Test Customer' },
        });
      });
    });

    it('updates cart with items', () => {
      schema.expectCart().expects([
        {
          method: 'put',
          url: '/carts/{cart_id}',
          data: {
            cart_id: 123,
            account_id: undefined,
            $promotions: true,
            items: [{
              product_id: 1,
              quantity: 2,
            }],
          },
          result: {
            id: 123,
            items: [{
              product_id: 1,
              quantity: 2,
            }],
          },
        },
      ]);
      return api.post('/v1/cart', {
        items: [{
          product_id: 1,
          quantity: 2,
        }],
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          items: [{
            product_id: 1,
            quantity: 2,
          }],
        });
      });
    });
  });

  describe('POST /v1/cart/add-item', () => {
    schema.expectCartAddItem = (itemProps) => {
      const item = _.merge(
        {
          product_id: 1,
          quantity: 2,
        },
        itemProps
      );
      schema.expectCart().expects([
        {
          method: 'get',
          url: '/products/{product_id}',
          result: {
            id: 1,
          },
        },
        {
          method: 'put',
          url: '/carts/{cart_id}',
          data: {
            cart_id: 123,
            items: [ item ],
          },
          result: {
            id: 123,
            items: [ item ],
          },
        },
      ]);
      return schema;
    };

    it('adds an item to cart', () => {
      schema.expectCartAddItem();
      api.post('/v1/cart/add-item', {
        product_id: 1,
        quantity: 2,
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          items: [{
            product_id: 1,
            quantity: 2,
          }],
        });
      });
    });

    it('throws an error when specifying price', () => {
      schema.expectCart().expects([
        {
          method: 'get',
          url: '/products/{product_id}',
          result: {
            id: 1,
          },
        },
      ]);
      api.post('/v1/cart/add-item', {
        product_id: 1,
        quantity: 2,
        price: 10,
      }).then(result => {
        assert.ok(result && result.error);
      });
    });

    it('throws an error when missing product_id', () => {
      api.post('/v1/cart/add-item', {
        product_id: undefined,
      }).then(result => {
        assert.ok(result && result.error);
      });
    });
  });

  describe('POST /v1/cart/remove-item', () => {
    it('removes an item from cart', () => {
      // TODO
      schema.reset();
    });
  });

  describe('POST /v1/cart/shipment-rating', () => {
    it('generates shipment rates from cart', () => {
      // TODO
      schema.reset();
    });
  });

  describe('POST /v1/cart/checkout', () => {
    it('converts cart to order', () => {
      // TODO
      schema.reset();
    });
  });
});
