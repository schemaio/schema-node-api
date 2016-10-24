const apicache = require('apicache');

module.exports = (env) => {
  if (!env.CACHE_SECONDS) {
    return (req, res, next) => next();
  }
  return apicache.options({
    debug: env.NODE_ENV === 'development',
    appendKey: [ 'sessionID' ],
  }).middleware(env.CACHE_SECONDS + ' seconds');
};
