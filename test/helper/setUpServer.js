const { createServer } = require('http');
const session = require('../../src/index');

module.exports = function setUpServer(handler, nextSessionOpts = {}, beforeHandle) {
  const server = createServer();

  if (typeof beforeHandle === 'function') {
    server.on('request', beforeHandle);
  }

  server.on('request', async (req, res) => {
    await new Promise((resolve) => {
      session(nextSessionOpts)(req, res, resolve);
    });
    await handler(req, res);
  });

  return server;
};
