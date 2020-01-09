/* eslint-disable no-param-reassign */
const crypto = require('crypto');
const parseCookie = require('cookie').parse;
const { promisify } = require('util');
const MemoryStore = require('./session/memory');
const Store = require('./session/store');
const Cookie = require('./session/cookie');
const Session = require('./session/session');
const { parseToMs } = require('./session/utils');

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

function hash(sess) {
  const str = JSON.stringify(sess, (key, val) => {
    if (key === 'cookie') {
      //  filtered out session.cookie
      return undefined;
    }
    return val;
  });
  //  hash
  return crypto
    .createHash('sha1')
    .update(str, 'utf8')
    .digest('hex');
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

async function initSession(req, options) {
  const generateId = options.generateId || generateSessionId;
  const cookieOptions = options.cookie || {};
  if (req.sessionId) {
    const sess = await req.sessionStore.get(req.sessionId);
    if (sess) return req.sessionStore.createSession(req, sess);
  }
  return req.sessionStore.generate(req, generateId(), cookieOptions);
}

async function saveSession(req, hashedSess, options) {
  const touchAfter = options.touchAfter ? parseToMs(options.touchAfter) : 0;
  if (req.session) {
    if (hash(req.session) !== hashedSess) {
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
  }
  return false;
}

function session(options = {}) {
  const name = options.name || 'sessionId';
  const store = options.store || new MemoryStore();
  const rollingSession = options.rolling || false;
  const storePromisify = options.storePromisify || false;

  //  Notify MemoryStore should not be used in production
  //  eslint-disable-next-line no-console
  if (store instanceof MemoryStore) console.warn('MemoryStore should not be used in production environment.');

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
    if (req.session) { next(); return; }

    //  check for store readiness before proceeded
    if (!storeReady) { next(); return; }
    //  TODO: add pathname mismatch check
    //  Expose store
    req.sessionStore = store;

    //  Try parse cookie if not already
    req.cookies = req.cookies
  || (req.headers && typeof req.headers.cookie === 'string' && parseCookie(req.headers.cookie)) || {};

    //  Get sessionId cookie;
    const cookieId = req.cookies[name];
    req.sessionId = cookieId;

    const sess = await initSession(req, options);
    const hashedSess = hash(sess);

    proxyEnd(res, async (done) => {
      const saved = await saveSession(req, hashedSess, options);
      if (
        (saved || rollingSession || cookieId !== req.sessionId)
            && req.session
      ) res.setHeader('Set-Cookie', req.session.cookie.serialize(name, req.sessionId));
      done();
    });

    next();
  };
}

const useSession = (req, res, opts) => {
  if (!req || !res) return Promise.resolve();
  return new Promise((resolve) => {
    session(opts)(req, res, resolve);
  }).then(() => {
    const sessionValues = { ...req.session };
    delete sessionValues.cookie;
    return sessionValues;
  });
};

const withSession = (handler, options) => {
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
};

module.exports = session;
module.exports.withSession = withSession;
module.exports.useSession = useSession;
module.exports.Store = Store;
module.exports.Cookie = Cookie;
module.exports.Session = Session;
module.exports.MemoryStore = MemoryStore;
