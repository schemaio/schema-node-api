const _ = require('lodash');
const express = require('express');

module.exports = () => {
  const router = express.Router();

  // Define a route handler to resolve promises
  const promiseHandler = (origHandler, req, res, next) => {
    let result;
    try {
      result = origHandler.call(router, req, res, next);
    } catch (err) {
      return handleRouterError(err, res);
    }
    if (result && typeof result.then === 'function') {
      result.then(value => {
        res.json(
          (value && value.toObject) ? value.toObject() : value
        );
      }).catch(err => {
        return handleRouterError(err, res);
      });
    } else if (result !== undefined) {
      res.json(result);
    }
  };

  // Wraps router methods to resolve promises
  _.each(['get', 'put', 'post', 'delete', 'use'], (method) => {
    const origMethod = router[method];
    router[method] = (...args) => {
      // Extract original handler
      const handler = args.splice(-1, 1)[0];
      if (typeof handler !== 'function') {
        throw new Error('Route handler must be a function');
      }
      // Replace original handler
      args.push(promiseHandler.bind(router, handler));
      origMethod.apply(router, args);
    };
  });

  return router;
};

// Graceful error handler
function handleRouterError(err, res) {
  const message =  err.toString().replace('Error: ', '');
  res.status(err.code || 500).json({
    error: err.code ? message : 'Internal Server Error'
  });
  if (!err.code) {
    console.log(err);
  }
}
