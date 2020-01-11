/* eslint-disable no-param-reassign */
const crypto = require('crypto');
const parseCookie = require('cookie').parse;
const { promisify } = require('util');
const MemoryStore = require('./session/memory');
const Store = require('./session/store');
const Cookie = require('./session/cookie');
const Session = require('./session/session');
const { parseToMs } = require('./session/utils');

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

async function initialize(req, res, options) {
  // eslint-disable-next-line no-multi-assign
  const originalId = req.sessionId = req.headers && req.headers.cookie
    ? parseCookie(req.headers.cookie)[options.name]
    : null;

  req.sessionStore = options.store;

  if (req.sessionId) {
    const sess = await req.sessionStore.get(req.sessionId);
    if (sess) req.sessionStore.createSession(req, sess);
  }
  if (!req.session) req.sessionStore.generate(req, options.generateId(), options.cookie);

  req._session = {
    // FIXME: Possible dataloss
    original: JSON.parse(JSON.stringify(req.session)),
    originalId,
    options,
  };

  // autocommit
  if (options.autoCommit) {
    proxyEnd(res, async (done) => {
      if (req.session) { await req.session.commit(res); }
      done();
    });
  }

  return req.session;
}

function session(opts = {}) {
  const options = {
    name: opts.name || 'sessionId',
    store: opts.store || new MemoryStore(),
    storePromisify: opts.storePromisify || false,
    generateId: opts.genid || opts.generateId || function generateId() { return crypto.randomBytes(16).toString('hex'); },
    rolling: opts.rolling || false,
    touchAfter: opts.touchAfter ? parseToMs(opts.touchAfter) : 0,
    cookie: opts.cookie || {},
    autoCommit: typeof opts.autoCommit !== 'undefined' ? opts.autoCommit : true,
  };


  const { store, storePromisify } = options;

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
    await initialize(req, res, options);
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
