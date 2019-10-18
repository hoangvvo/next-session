const { createServer } = require('http');
const { promisify } = require('util');
const { withSession } = require('../../src/index');

module.exports = async function setUpServer(handler, nextSessionOpts = {}, beforeHandle) {
  const server = createServer();

  if (typeof beforeHandle === 'function') {
    server.on('request', beforeHandle);
  }

  server.on('request', withSession(handler, nextSessionOpts));

  await promisify(server.listen.bind(server))();

  return server;
};
