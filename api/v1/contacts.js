const util = require('../util');

const contacts = module.exports;

// Init routes
contacts.init = (env, router, schema) => {
  router.post('/contacts/subscribe', contacts.subscribe.bind(this, schema));
  router.post('/contacts/unsubscribe', contacts.unsubscribe.bind(this, schema));
};

// Subscribe contact to list
contacts.subscribe = (schema, req) => {
  contacts.sanitizeEmailOptinLists(req, true);
  let data = util.filterData(req.body, [
    'first_name',
    'last_name',
    'email',
    'email_optin',
    'email_optin_lists'
  ]);
  data.email_optin = true;
  return schema.put('/contacts/{email}', data).then(result => {
    if (result && result.errors) {
      return result;
    }
    return { success: true };
  });
};

// Unsubscribe contact from list
contacts.unsubscribe = (schema, req) => {
  contacts.sanitizeEmailOptinLists(req, false);
  let data = util.filterData(req.body, [
    'email',
    'email_optin_lists'
  ]);
  return schema.put('/contacts/{email}', data).then(result => {
    if (result && result.errors) {
      return result;
    }
    return { success: true };
  });
};

contacts.sanitizeEmailOptinLists = (req, optin) => {
  let reqLists = req.body.email_optin_lists;
  if (!reqLists) {
    if (!optin) {
      req.body.email_optin = false;
      req.body.$set = req.body.$set || {};
      req.body.$set.email_optin_lists = {};
    }
    return;
  }

  let listArray;
  if (typeof reqLists === 'string') {
    listArray = reqLists.split(/\s*,\s*/);
  } else if (Array.isArray(reqLists)) {
    listArray = reqLists;
  }

  if (listArray) {
    reqLists = {};
    for (let i = 0; i < listArray.length; i++) {
      const list = listArray[i];
      if (typeof list === 'string') {
        reqLists[list] = !!optin;
      }
    }
  } else if (!optin) {
    throw util.error(400, 'Unsubscribe expects `email_optin_lists` to be an array of lists to remove');
  }

  req.body.email_optin_lists = reqLists;
};
