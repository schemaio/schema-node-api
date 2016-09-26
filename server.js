/**
 * This is the main Express app.
 */

// Dependencies
const http = require('http');
const express = require('express');

// Express Middleware
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const expressEnforcesSSL = require('express-enforces-ssl');

// Read `.env` into `process.env`
require('dotenv').config({
  silent: true,
});

// Load nconf environment variable defaults
require('nconf').env().defaults({
  NODE_ENV: 'development',
});

// Load environment
const env = require('./env');

// Create Express App
const main = express();

// HTTPS Forwarding
// Needed for Heroku / Load Balancers
main.enable('trust proxy');

// Force Redirect to SSL
if (env.FORCE_SSL) {
  main.use(expressEnforcesSSL());
}

// Enable CORS
main.use(cors({
  maxAge: 86400000, // 1 day
}));

// Gzip compression
main.use(compression());

// Body parsing
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: true }));

// Get session ID from header
main.use((req, res, next) => {
  req.sessionID = req.get('x-session') || null;
  next();
});

// Logging
main.use(morgan('short'));

// Use API routes
main.use(require('./api')(env));

// Start the HTTP server
const server = http.createServer(main);
server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\nExpress Server [PORT: ${env.PORT}] [NODE_ENV: ${env.NODE_ENV}]\n`);
});
