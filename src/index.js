/* eslint-disable no-param-reassign */
const crypto = require('crypto');
const parseCookie = require('cookie').parse;
const { promisify } = require('util');
const MemoryStore = require('./session/memory');
const Store = require('./session/store');
const Cookie = require('./session/cookie');
const Session = require('./session/session');

function proxyEnd(res, fn) {
  let ended = false;
  const oldEnd = res.end;
  res.end = function resEndProxy(...args) {
    const self = this;
    if (res.headersSent || res.finished || ended) return;
    ended = true;
    fn(() => {
      oldEnd.apply(self, args);
    });
  };
}

let storeReady = true;

async function initialize(req, res, options = {}, store) {
  const name = options.name || 'sessionId';
  const autoCommit = options.autoCommit !== undefined ? options.autoCommit : true;
  req.sessionId = req.cookies[name];
  req.sessionStore = store || options.store || new MemoryStore();
  req.sessionOpts = options;
  req.sessionOpts.name = name;
  const generateId = options.generateId || function generateId() { return crypto.randomBytes(16).toString('hex'); };
  const cookieOptions = options.cookie || {};
  if (req.sessionId) {
    const sess = await req.sessionStore.get(req.sessionId);
    if (sess) req.sessionStore.createSession(req, sess);
  }
  if (!req.session) req.sessionStore.generate(req, generateId(), cookieOptions);
  // FIXME: Possible dataloss
  req.originalSession = JSON.parse(JSON.stringify(req.session));
  // autocommit
  if (autoCommit) {
    proxyEnd(res, async (done) => {
      if (req.session) { await req.session.commit(res); }
      done();
    });
  }

  return req.session;
}

function session(options = {}) {
  const store = options.store || new MemoryStore();
  const storePromisify = options.storePromisify || false;

  //  Promisify callback-based store.
  if (storePromisify) {
    store.get = promisify(store.get);
    store.set = promisify(store.set);
    store.destroy = promisify(store.destroy);
    if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  }

  //  store readiness
  store.on('disconnect', () => {
    storeReady = false;
  });
  store.on('connect', () => {
    storeReady = true;
  });

  return async (req, res, next) => {
    if (req.session || !storeReady) { next(); return; }
    //  TODO: add pathname mismatch check
    req.cookies = req.cookies
  || (req.headers && typeof req.headers.cookie === 'string' && parseCookie(req.headers.cookie)) || {};
    await initialize(req, res, options, store);
    next();
  };
}

function useSession(req, res, opts) {
  if (!req || !res) return Promise.resolve();
  return new Promise((resolve) => {
    session(opts)(req, res, resolve);
  }).then(() => {
    const sessionValues = { ...req.session };
    delete sessionValues.cookie;
    return sessionValues;
  });
}

function withSession(handler, options) {
  const isApiRoutes = !Object.prototype.hasOwnProperty.call(handler, 'getInitialProps');
  const oldHandler = (isApiRoutes) ? handler : handler.getInitialProps;

  function handlerProxy(...args) {
    let req;
    let res;
    if (isApiRoutes) {
      [req, res] = args;
    } else {
      req = args[0].req || (args[0].ctx && args[0].ctx.req);
      res = args[0].res || (args[0].ctx && args[0].ctx.res);
    }
    if (req && res) {
      return new Promise((resolve) => {
        session(options)(req, res, resolve);
      }).then(() => oldHandler.apply(this, args));
    } return oldHandler.apply(this, args);
  }

  if (isApiRoutes) handler = handlerProxy;
  else handler.getInitialProps = handlerProxy;
  return handler;
}

module.exports = session;
module.exports.initialize = initialize;
module.exports.withSession = withSession;
module.exports.useSession = useSession;
module.exports.Store = Store;
module.exports.Cookie = Cookie;
module.exports.Session = Session;
module.exports.MemoryStore = MemoryStore;
