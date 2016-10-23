const _ = require('lodash');
const util = require('util');
const express = require('express');
const Promise = require('bluebird');
const Schema = require('schema-client');
const API = require('../api');

// Read `.env` into `process.env`
require('dotenv').config({
  silent: true,
});

// Load nconf environment variable defaults
require('nconf').env().defaults({
  NODE_ENV: 'development',
});

// Load env
const env = require('../env');

// Global assert
global.assert = require('chai').assert;

// Global test utils
const Test = global.Test = module.exports;

// Helper to format values for test output
const inspect = (value) => {
  return util.inspect(value, {
    showHidden: true,
    depth: 7,
  });
};

// Helper to create a test schema client
Test.schemaClient = (sessionId) => {
  const schema = new Schema.Client();

  // Default session ID
  sessionId = schema.sessionId = sessionId || 'session';

  let expectations = [];
  let inited = false;

  // Get/Set expectations
  schema.expects = (requests) => {
    if (!inited) {
      assert.fail('Schema test client must call init() in the top level describe() first');
    }
    if (requests instanceof Array) {
      requests.forEach(req => expectations.push(req));
    } else if (requests && typeof requests === 'object') {
      expectations.push(requests);
    }
    return expectations;
  };

  // Init hooks
  schema.init = () => {
    inited = true;
    beforeEach(() => {
      schema.reset();
    });
    afterEach(() => {
      expectations.forEach(exp => {
        const expRequest = inspect(exp);
        assert.fail(undefined, exp, 'Schema expected:\n' + expRequest + '\nbut received nothing');
      });
      schema.reset();
    });
  };

  // Reset expectations
  schema.reset = () => {
    expectations = [];
    return schema;
  };

  // Set session expectation
  schema.expectSession = (props) => {
    schema.expects([
      {
        method: 'get',
        url: '/:sessions/{id}',
        result: _.merge({ id: sessionId }, props),
      },
      {
        method: 'get',
        url: '/:clients/:self',
        result: {
          id: 'test',
        },
      },
    ]);
    return schema;
  };

  // Set logged out expectation
  schema.expectLoggedOut = () => {
    schema.expects([
      {
        method: 'get',
        url: '/:sessions/{id}',
        result: {
          id: sessionId,
          account_id: null,
        },
      },
      {
        method: 'get',
        url: '/:clients/:self',
        result: {
          id: 'test',
        },
      },
    ]);
    return schema;
  };

  // Set logged out expectation
  schema.expectLoggedIn = () => {
    schema.expects([
      {
        method: 'get',
        url: '/:sessions/{id}',
        result: {
          id: sessionId,
          account_id: sessionId,
        },
      },
      {
        method: 'get',
        url: '/:clients/:self',
        result: {
          id: 'test',
        },
      },
    ]);
    return schema;
  };

  const requestHandler = (method, url, data, callback) => {
    const actualRequest = {
      method: method,
      url: url,
      data: data
    };
    let result = undefined;
    const expectedRequest = expectations.shift();
    if (expectedRequest) {
      result = expectedRequest.result;
      if (result !== undefined) {
        delete expectedRequest.result;
      }
      if (expectedRequest.data === undefined) {
        delete actualRequest.data;
      } else if (typeof expectedRequest.data === 'function') {
        expectedRequest.data = expectedRequest.data(data);
      }
      try {
        assert.deepEqual(expectedRequest, actualRequest);
      } catch (err) {
        const expected = inspect(expectedRequest);
        const actual = inspect(actualRequest);
        return Promise.reject('Schema expected: \n' + expected + '\nbut received: \n' + actual);
      }
    }
    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  }

  _.each(['get', 'put', 'post', 'delete'], (method) => {
    schema[method] = requestHandler.bind(schema, method);
  });

  return schema;
};

// Helper to create a test API client
Test.apiClient = (schema) => {
  const router = API(env, schema);

  const requestHandler = (method, url, data) => {
    return new Promise(resolve => {
      let req = Test.buildReq(method, url, data, schema.sessionId);
      let res = Test.buildRes(req, resolve);
      router.handle(req, res, (err) => {
        if (err) {
          return res.status(500).json({
            error: 'Router Error: ' + err.toString()
          });
        }
        return res.status(404).json({
          error: 'Route not found ' + method.toUpperCase() + ' ' + url
        });
      });
    });
  };

  let api = {};
  _.each(['get', 'put', 'post', 'delete'], (method) => {
    api[method] = requestHandler.bind(api, method);
  });

  return api;
};

// Helper to build express request
Test.buildReq = (method, url, data, sessionId) => {
  let req = new express.request.__proto__.constructor();

  req.headers = {};
  req.rawHeaders = [];
  req.method = method;
  req.url = url
  req.hostname = 'api';
  req.data = data;
  req.body = data;
  req.session = { id: sessionId };
  req.sessionId = sessionId;
  req.sessionID = sessionId;

  return req;
};

// Helper to build express response
Test.buildRes = (req, resolve) => {
  let res = new express.response.__proto__.constructor(req);

  res.end = (result) => {
    if (res.sent) {
      return res;
    }
    res.sent = true;
    resolve(result);
    return res;
  };

  res.status = (code) => {
    res.statusCode = ~~code;
    return res;
  };

  res.send = res.end;
  res.json = res.end;

  res.append = undefined;
  res.render = undefined;
  res.redirect = undefined;
  res.links = undefined;
  res.jsonp = undefined;
  res.download = undefined;
  res.cookie = undefined;
  res.clearCookie = undefined;
  res.sendFile = undefined;

  return res;
};

// Require modules from base path
Test.requireBase = (path) => {
  return require('../' + path)
};
