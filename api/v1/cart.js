const _ = require('lodash');
const Promise = require('bluebird');
const util = require('../util');
const session = require('./session');
const account = require('./account');

const cart = module.exports;

// Init routes
cart.init = (env, router, schema) => {
  const requireSession = session.require.bind(this, schema);
  router.get('/cart', requireSession, cart.get.bind(this, schema));
  router.put('/cart', requireSession, cart.update.bind(this, schema));
  router.post('/cart', requireSession, cart.create.bind(this, schema));
  router.post('/cart/add-item', requireSession, cart.addItem.bind(this, schema));
  router.post('/cart/remove-item', requireSession, cart.removeItem.bind(this, schema));
  router.post('/cart/apply-coupon', requireSession, cart.applyCoupon.bind(this, schema));
  router.get('/cart/shipment-rating', requireSession, cart.shipmentRating.bind(this, schema));
  router.post('/cart/checkout', requireSession, cart.checkout.bind(this, schema));
};

cart.get = (schema, req) => {
  return schema.get('/carts/{id}', {
    id: req.session.cart_id,
    expand: 'items.product, items.variant, items.bundle_items.product, items.bundle_items.variant',
  });
};

cart.update = (schema, req) => {
  return cart.ensureExists(schema, req).then(() => {
    var cartData = {
      cart_id: req.session.cart_id,
      $promotions: true,
    };
    if (req.body.items) {
      cartData.items = util.filterData(req.body.items, [
        'id',
        'product_id',
        'variant_id',
        'options',
        'quantity'
      ]);
    }
    var accountEmail = req.body.account && req.body.account.email;
    if (req.session.account_id) {
      cartData.account_id = req.session.account_id;
    } else if (accountEmail) {
      cartData.account_id = null;
      cartData.account = { email: accountEmail };
    }
    if (req.body.shipping !== undefined) {
      cartData.shipping = cart.sanitizeShipping(req.body.shipping);
    }
    if (req.body.billing !== undefined) {
      cartData.billing = cart.sanitizeBilling(req.body.billing);
    }
    if (req.body.coupon_code !== undefined) {
      cartData.coupon_code = req.body.coupon_code;
    }
    if (req.body.shipment_rating !== undefined) {
      cartData.shipment_rating = req.body.shipment_rating;
    }
    return schema.put('/carts/{cart_id}', cartData).then(result => {
      // Update anonymous account if created new
      if (accountEmail && result.account.id && !result.account.name) {
        return schema.put('/accounts/{account_id}', {
          account_id: result.account.id,
          first_name: cartData.shipping.first_name,
          last_name: cartData.shipping.last_name,
          shipping: cartData.shipping,
          billing: cartData.billing,
        });
      }
    });
  }).then(() => {
    return cart.get(schema, req);
  });
};

cart.create = (schema, req) => {
  return cart.update(schema, req);
};

// Add item to cart
cart.addItem = (schema, req) => {
  if (!req.body.product_id) {
    throw util.error(400, 'Missing parameter `product_id`');
  }
  return cart.ensureExists(schema, req).then(result => {
    return cart.validateProduct(schema, req.body).then(() => {
      req.body.cart_id = req.session.cart_id;
      return schema.post('/carts/{cart_id}/items', (
        util.filterData(req.body, [
          'cart_id',
          'product_id',
          'variant_id',
          'options',
          'quantity'
        ])
      )).then(result => {
        return cart.get(schema, req);
      });
    });
  });
};

// Remove item from cart
cart.removeItem = (schema, req) => {
  if (req.body.item_id === null || req.body.item_id === undefined) {
    return {
      errors: {
        item_id: {
          code: 'REQUIRED',
          message: 'Item ID or index must be specified'
        }
      }
    };
  }
  return schema.delete('/carts/{cart_id}/items/{item_id}', {
    cart_id: req.session.cart_id,
    item_id: req.body.item_id,
  }).then(() => {
    return cart.get(schema, req);
  });
};

// Apply a coupon code
cart.applyCoupon = (schema, req) => {
  return schema.put('/carts/{cart_id}', {
    cart_id: req.session.cart_id,
    coupon_code: req.body.code || req.body.coupon_code || null,
  }).then(result => {
    if (result.errors && result.errors.coupon_code) {
      return result;
    }
    return cart.get(schema, req);
  });
};

// Ensure shipping fields are sane
cart.sanitizeShipping = (shipping) => {
  delete shipping.service_name;
  delete shipping.price;
  if (shipping.first_name || shipping.last_name) {
    shipping.name = shipping.first_name + ' ' + shipping.last_name;
  }
  shipping = util.filterData(shipping, [
    'name',
    'first_name',
    'last_name',
    'address1',
    'address2',
    'company',
    'city',
    'state',
    'zip',
    'country',
    'phone',
    'account_address_id',
    'service',
  ]);
  return shipping;
},

// Ensure billing fields are sane
cart.sanitizeBilling = (billing) => {
  delete billing.method;
  if (billing.first_name || billing.last_name) {
    billing.name = billing.first_name + ' ' + billing.last_name;
  }
  billing = util.filterData(billing, [
    'name',
    'first_name',
    'last_name',
    'address1',
    'address2',
    'company',
    'city',
    'state',
    'zip',
    'country',
    'phone',
    'card',
    'account_card_id'
  ]);
  // Default to credit card billing
  if (!billing.method) {
    billing.method = 'card';
  }
  if (billing.card) {
    billing.card = util.filterData(billing.card, [
      'token',
      'brand',
      'last4',
      'exp_month',
      'exp_year'
    ]);
  }
  return billing;
},

// Get cart shipment rating
cart.shipmentRating = (schema, req) => {
  return cart.ensureExists(schema, req).then(() => {
    req.body.shipment_rating = null;
    return cart.update(schema, req);
  }).then(result => {
    if (!result.items || !result.items.length) {
      return {
        errors: {
          items: {
            code: 'REQUIRED',
            message: 'Cart must have at least one item'
          }
        }
      };
    }
    const errors = util.requireFields(result, [
      'shipping.country'
    ]);
    if (errors) {
      return { errors: errors };
    }
    return result.shipment_rating;
  });
};

// Perform cart checkout
cart.checkout = (schema, req) => {
  return cart.ensureExists(schema, req).then(() => {
    return cart.update(schema, req);
  }).then(result => {
    var errors = this.validateCheckout(result);
    if (errors) {
      return errors;
    }
    return schema.post('/orders', {
      cart_id: req.session.cart_id
    });
  }).then(order => {
    if (!order || order.errors) {
      return order;
    }
    // Remove cart ID from session
    return schema.put('/:sessions/{id}', {
      id: req.sessionID,
      cart_id: null,
      order_id: order.id,
    });
  }).then(session => {
    return schema.get('/orders/{id}', { id: session.order_id });
    // TODO: fix this
    // return account.getOrderById(schema, {
    //   session: req.session,
    //   params: {
    //     id: session.order_id,
    //   },
    // });
  });
};

cart.validateCheckout = (data) => {
  if (!data) {
    return null;
  }
  if (!data.items || !data.items.length) {
    return {
      errors: {
        items: {
          code: 'REQUIRED',
          message: 'Cart must have at least one item'
        }
      }
    };
  }

  let errors = util.requireFields(data, [
    'account_id',
    'billing.name',
    'billing.method'
  ]);
  if (errors && errors.account_id) {
    errors.account_id.message = 'Customer must be logged in';
  }
  if (data.billing && data.billing.method === 'card') {
    errors = util.requireFields(data, [
      'billing.card.token'
    ], errors);
  }
  if (data.shipment_delivery) {
    errors = util.requireFields(data, [
      'shipping.name',
      'shipping.address1',
      'shipping.city',
      'shipping.country',
      'shipping.service'
    ], errors);
  }
  const country = data.shipping && data.shipping.country && data.shipping.country.toUpperCase();
  if (country === 'US' || country === 'CA') {
    errors = util.requireFields(data, [
      'shipping.state'
    ], errors);
  }
  return errors ? { errors: errors } : null;
};

// Ensure a cart exists before operating on it
cart.ensureExists = (schema, req) => {
  return Promise.try(() => {
    // Get existing cart
    if (req.session.cart_id) {
      return schema.get('/carts/{cart_id}', {
        cart_id: req.session.cart_id
      });
    }
  }).then(result => {
    if (result) {
      return result;
    }
    // Create new cart
    return schema.post('/carts', {
      account_id: req.session.account_id
    }).then(result => {
      if (!result || result.errors) {
        throw new Error('Unable to create cart');
      }
      // Put cart ID in session
      return schema.put('/:sessions/{id}', {
        id: req.sessionID,
        cart_id: result.id
      }).then(() => result);
    });
  }).then(result => {
    req.session.cart_id = result.id;
    return result;
  });
};

// Validate a cart product before adding it
cart.validateProduct = (schema, data) => {
  return schema.get('/products/{product_id}', {
    product_id: data.product_id,
    active: true,
    include: {
      variant: {
        url: '/products:variants/{variant_id}',
        data: {
          parent_id: data.product_id,
          variant_id: data.variant_id,
          active: true
        }
      }
    }
  }).then(product => {
    product = product || {};
    var productId = product.id;
    var variantId = product.variant && product.variant.id;
    if (!product.id) {
      throw new util.error(400, 'Product not found');
    }
    if (product.delivery === 'subscription') {
      throw new util.error(400, 'Subscription products cannot be added to a cart');
    }
    if (product.variable && !data.variant_id) {
      // Return first variant
      return schema.get('/products:variants/:last', {
        product_id: data.product_id,
        active: true,
        fields: 'id',
      }).then(variant => {
        if (variant) {
          data.variant_id = variant.id;
        }
      });
    }
    if (data.variant_id && !product.variant) {
      throw new util.error(400, 'Variant not found for this product (' + product.name + ')');
    }
    if (data.variant_id && !product.variable) {
      throw new util.error(400, 'Product is not variable (' + product.name + ')');
    }
    // Valid
    data.product_id = productId;
    data.variant_id = variantId;
  });
};
