/* eslint-disable no-param-reassign */
const crypto = require('crypto');
const parseCookie = require('cookie').parse;
const { promisify } = require('util');
const MemoryStore = require('./session/memory');
const Store = require('./session/store');
const Cookie = require('./session/cookie');
const Session = require('./session/session');
const { parseToMs } = require('./session/utils');

const DEFAULT_NAME = 'sessionId';

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

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

async function initSession(req, options, store) {
  const name = options.name || DEFAULT_NAME;
  req.sessionId = req.cookies[name];
  req.sessionStore = store || options.store || new MemoryStore();
  const generateId = options.generateId || generateSessionId;
  const cookieOptions = options.cookie || {};
  if (req.sessionId) {
    const sess = await store.get(req.sessionId);
    if (sess) store.createSession(req, sess);
  }
  if (!req.session) store.generate(req, generateId(), cookieOptions);
  // FIXME: Possible dataloss
  req.originalSession = JSON.parse(JSON.stringify(req.session));
  return req.session;
}

async function saveSession(req, options) {
  const touchAfter = options.touchAfter ? parseToMs(options.touchAfter) : 0;
  const stringify = (sess) => JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val));
  if (!req.session) return false;
  if (stringify(req.session) !== stringify(req.originalSession)) {
    await req.session.save();
    return true;
  }
  //  Touch: extend session time despite no modification
  if (req.session.cookie.maxAge && touchAfter >= 0) {
    const minuteSinceTouched = (
      req.session.cookie.maxAge
          - (req.session.cookie.expires - new Date())
    );
    if ((minuteSinceTouched >= touchAfter)) {
      await req.session.touch();
      return true;
    }
    return false;
  }
  return false;
}

function commitSession(req, res, options) {
  const name = options.name || DEFAULT_NAME;
  const rollingSession = options.rolling || false;
  proxyEnd(res, async (done) => {
    const saved = await saveSession(req, options);
    if (
      (saved || rollingSession || req.cookies[name] !== req.sessionId)
          && req.session
    ) res.setHeader('Set-Cookie', req.session.cookie.serialize(name, req.sessionId));
    done();
  });
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
    //  Try parse cookie if not already
    req.cookies = req.cookies
  || (req.headers && typeof req.headers.cookie === 'string' && parseCookie(req.headers.cookie)) || {};
    await initSession(req, options, store);
    commitSession(req, res, options);
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
module.exports.withSession = withSession;
module.exports.useSession = useSession;
module.exports.Store = Store;
module.exports.Cookie = Cookie;
module.exports.Session = Session;
module.exports.MemoryStore = MemoryStore;
