const { createServer } = require('http');
const { promisify } = require('util');
const { withSession } = require('../../src/index');

module.exports = async function setUpServer(handler, customOpts = {}) {
  const server = createServer();

  if (customOpts.beforeHandle) {
    server.on('request', customOpts.beforeHandle);
  }

  server.on('request', withSession(handler, {
    ...customOpts.nextSession,
  }));

  await promisify(server.listen.bind(server))();

  return server;
};
