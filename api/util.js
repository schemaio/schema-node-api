const _ = require('lodash');

const util = module.exports;

// Remove undefined keys from data, recursive
util.cleanData = (data) => {
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if(data[key] === undefined){
       delete data[key];
    } else if (data[key] instanceof Array) {
      for (let x = 0; x < data[key].length; x++) {
        if (data[key][x] === undefined) {
          data[key].splice(x, 1);
          x--;
        } else if (data[key][x] && typeof data[key][x] === 'object') {
          data[key][x] = util.cleanData(data[key][x]);
        }
      }
    } else if (data[key] && typeof data[key] === 'object') {
      data[key] = util.cleanData(data[key]);
    }
  }
  return data;
};

// Filter and merge query with request data and extra params
util.filterQuery = (req, extra, query, privateFields) => {
  query = Core.util.merge(query, extra, req.data);
  if (privateFields) {
    privateFields.forEach(field => {
      if (req.data[field] !== undefined) {
        throw new Error('Query may not specify `' + field + '` using a public key');
      }
    });
  }
  if (req.data.include !== undefined) {
    throw new Error('Query may not specify `include` using a public key');
  }
  return util.cleanData(query);
};

// Filter data and throw error when some fields are targeted
util.filterData = (data, fields) => {
  if (!data) {
    return data;
  }
  if (data instanceof Array) {
    data.forEach((val, i) => {
      data[i] = util.filterData(val, fields);
    });
    return data;
  }
  if (fields && fields.length) {
    const keys = Object.keys(data || {});
    keys.forEach(key => {
      if (fields.indexOf(key) === -1) {
        throw util.error(400, 'Query may not specify `' + key + '` on this resource');
      }
    });
  }
  return util.cleanData(data);
};

// Ensure some fields are required in data
// Returns errors
util.requireFields = (data, fields, errors) => {
  if (!(fields instanceof Array)) {
    fields = [fields];
  }
  fields.forEach(fieldPath => {
    const value = _.get(data, fieldPath);
    if (!value) {
      errors = errors || {};
      errors[fieldPath] = {
        code: 'REQUIRED',
        message: 'Required'
      };
    }
  });
  return errors;
};

// Determine whether req.data.fields includes (or excludes) a field
util.fieldsInclude = (req, field, isExplicit) => {
  if (!req.body.fields) {
    // Include by default or explicitly
    return isExplicit ? false : true;
  } else if (req.body.fields.indexOf && req.body.fields.indexOf(field) !== -1) {
    return true;
  }
  return false;
};

// Create a response error with code
// Message will be returned to the client with status code
util.error = (statusCode, message) => {
  let err = new Error(message);
  err.code = statusCode;
  return err;
};
