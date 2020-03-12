import { parse as parseCookie } from 'cookie';
import { randomBytes } from 'crypto';
import MemoryStore from './store/memory';
import Session from './session';
import Cookie from './cookie';

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

export function stringify(sess) { return JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val)); }

function getOptions(opts = {}) {
  return {
    name: opts.name || 'sessionId',
    store: opts.store || new MemoryStore(),
    generateId: opts.genid || opts.generateId || function generateId() { return randomBytes(16).toString('hex'); },
    rolling: opts.rolling || false,
    touchAfter: opts.touchAfter ? opts.touchAfter : 0,
    cookie: opts.cookie || {},
    autoCommit: typeof opts.autoCommit !== 'undefined' ? opts.autoCommit : true,
  };
}

export async function applySession(req, res, opts) {
  const options = getOptions(opts);

  if (req.session) return;

  const originalId = req.sessionId = req.headers && req.headers.cookie
    ? parseCookie(req.headers.cookie)[options.name]
    : null;

  req.sessionStore = options.store;

  if (req.sessionId) {
    const sess = await req.sessionStore.get(req.sessionId);
    if (sess) {
      req.session = new Session(req, res, sess);
      req.session.cookie = new Cookie(sess.cookie);
    }
  }

  if (!req.session) {
    req.sessionId = options.generateId();
    req.session = new Session(req, res);
    req.session.cookie = new Cookie(options.cookie);
  }

  // eslint-disable-next-line no-underscore-dangle
  req._session = {
    // FIXME: Possible dataloss
    originalStringified: stringify(req.session),
    originalId,
    options,
  };

  // autocommit
  if (options.autoCommit) {
    proxyEnd(res, async (done) => {
      if (req.session) { await req.session.commit(); }
      done();
    });
  }

  return req.session;
}
