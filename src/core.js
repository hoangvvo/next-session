import { parse as parseCookie } from 'cookie';
import nanoid from 'nanoid';
import MemoryStore from './store/memory';
import Session from './session';
import Cookie from './cookie';

export function stringify(sess) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

function getOptions(opts = {}) {
  return {
    name: opts.name || 'sid',
    store: opts.store || new MemoryStore(),
    generateId:
      opts.genid ||
      opts.generateId || nanoid,
    encode: opts.encode,
    decode: opts.decode,
    rolling: opts.rolling || false,
    touchAfter: opts.touchAfter ? opts.touchAfter : 0,
    cookie: opts.cookie || {},
    autoCommit: typeof opts.autoCommit !== 'undefined' ? opts.autoCommit : true
  };
}

export async function applySession(req, res, opts) {
  const options = getOptions(opts);

  if (req.session) return;

  const rawSessionId =
    req.headers && req.headers.cookie
      ? parseCookie(req.headers.cookie)[options.name]
      : null;
  req._sessId = 
    req.sessionId = rawSessionId && typeof options.decode === 'function'
      ? options.decode(rawSessionId)
      : rawSessionId;
  req._sessOpts = options;

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

  req._sessStr = stringify(req.session);

  // autocommit
  if (options.autoCommit) {
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args) {
      if (res.finished || res.writableEnded) return;
      if (req.session) await req.session.commit();
      oldEnd.apply(this, args);
    };
  }

  return req.session;
}
