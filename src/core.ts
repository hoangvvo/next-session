import { parse as parseCookie } from 'cookie';
import { nanoid } from 'nanoid';
import MemoryStore from './store/memory';
import Session from './session';
import { Options, Request, Response, SessionOptions } from './types';

export function stringify(sess: Session) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

function getOptions(opts: Options = {}): SessionOptions {
  return {
    name: opts.name || 'sid',
    store: opts.store || new MemoryStore(),
    genid: opts.genid || nanoid,
    encode: opts.encode,
    decode: opts.decode,
    rolling: opts.rolling || false,
    touchAfter: opts.touchAfter ? opts.touchAfter : 0,
    cookie: opts.cookie || {},
    autoCommit: typeof opts.autoCommit !== 'undefined' ? opts.autoCommit : true,
  };
}

export async function applySession(
  req: Request,
  res: Response,
  opts?: Options
): Promise<void> {
  const options = getOptions(opts);

  if (req.session) return;

  const rawSessionId =
    req.headers && req.headers.cookie
      ? parseCookie(req.headers.cookie)[options.name]
      : null;
  req._sessId = req.sessionId =
    rawSessionId && typeof options.decode === 'function'
      ? await options.decode(rawSessionId)
      : rawSessionId;
  req._sessOpts = options;

  req.sessionStore = options.store;

  if (req.sessionId) {
    const sess = await req.sessionStore.get(req.sessionId);
    if (sess) req.session = new Session(req, res, sess);
  }

  if (!req.session) {
    req.sessionId = options.genid();
    req.session = new Session(req, res);
  }

  req._sessStr = stringify(req.session);

  // autocommit
  if (options.autoCommit) {
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args: any) {
      if (res.finished || res.writableEnded) return;
      if (req.session) await req.session.commit();
      oldEnd.apply(this, args);
    };
  }
}
