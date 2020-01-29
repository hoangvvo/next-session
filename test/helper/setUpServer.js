const { createServer } = require('http');
const { withSession } = require('../../lib');

module.exports = function setUpServer(handler, nextSessionOpts = {}, beforeHandle) {
  const server = createServer();

  if (typeof beforeHandle === 'function') {
    server.on('request', beforeHandle);
  }

  server.on('request', withSession(handler, nextSessionOpts));

  return server;
};
