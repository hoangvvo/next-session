const { createServer } = require('http');
const { parse: parseCookie } = require('cookie');
const session = require('../../src/index');

module.exports = function setUpServer(handler, nextSessionOpts = {}, beforeHandle) {
  const server = createServer();

  if (typeof beforeHandle === 'function') {
    server.on('request', beforeHandle);
  }

  server.on('request', async (req, res) => {
    await new Promise((resolve) => {
      req.cookies = req.cookies
  || (req.headers && typeof req.headers.cookie === 'string' && parseCookie(req.headers.cookie)) || {};
      session(nextSessionOpts)(req, res, resolve);
    });
    await handler(req, res);
  });

  return server;
};
