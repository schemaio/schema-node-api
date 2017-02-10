const Promise = require('bluebird');

const session = module.exports;

const RESTRICTED_FIELDS = [
  'cart_id',
  'account_id',
  'account_group'
];

// Init routes
session.init = (env, router, schema) => {
  const requireSession = session.require.bind(this, schema);
  router.get('/session', requireSession, session.get.bind(this, schema));
  router.put('/session', requireSession, session.update.bind(this, schema));
};

// Require session and set to req.session
session.require = (schema, req, res, next) => {
  session.getByRequest(schema, req).then((session) => {
    if (session) {
      req.session = session;
      return next();
    }
    res.status(400).json({
      error: 'Session ID is must be defined in order to access this resource'
    });
  });
};

// Get session data
session.get = (schema, req) => {
  return Promise.resolve(req.session);
};

// Update session data
session.update = (schema, req, res) => {
  const error = session.validateData(req);
  if (error) {
    return res.status(400).json(error);
  }
  req.body.id = req.sessionID;
  return schema.put('/:sessions/{id}', req.body).then(result => {
    return result;
  });
};

// Get or create session from req.sessionID
session.getByRequest = (schema, req) => {
  return Promise.try(() => {
    if (!req.sessionID) {
      return;
    }
    return schema.get('/:sessions/{id}', {
      id: req.sessionID,
    }).then(result => {
      if (result) {
        return result;
      }
      return schema.put('/:sessions/{id}', {
        id: req.sessionID,
      });
    }).then(result => {
      // Map client info to session
      if (result) {
        return schema.get('/:clients/:self').then(self => {
          if (self) {
            if (result.toObject) {
              result = result.toObject();
            }
            result.currency = result.currency || self.currency;
            result.locale = self.locale;
            result.timezone = self.timezone;
          }
        }).then(() => {
          return session.getCurrencies(schema).then(rating => {
            result.currencies = rating.toObject();
          });
        }).then(() => {
          return result;
        });
      }
    });
  });
};

// Get currency rating
session.getCurrencies = (schema) => {
  return Promise.try(() => {
    if (session.currencies) {
      return session.currencies;
    }
    return schema.get('/:currencies').then(result => {
      // Cache for 1 hour
      session.currencies = result;
      setTimeout(() => {
        delete session.currencies;
      }, 3600000);
      return result;
    });
  });
};

// Validate restricted session fields
session.validateData = (req) => {
  for (var i = 0; i < RESTRICTED_FIELDS.length; i++) {
    var field = RESTRICTED_FIELDS[i];
    if (req.body[field] !== undefined) {
      return { error: 'Session `' + field + '` is restricted' };
    }
  }
};
