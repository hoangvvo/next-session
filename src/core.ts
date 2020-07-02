import { parse as parseCookie } from 'cookie';
import { nanoid } from 'nanoid';
import MemoryStore from './store/memory';
import Session from './session';
import { Options, Request, Response, SessionOptions } from './types';

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

  req.sessionId = req.headers && req.headers.cookie
    ? parseCookie(req.headers.cookie)[options.name]
    : null;

  if (req.sessionId && typeof options.decode === 'function') {
    req.sessionId = await options.decode(req.sessionId);
  }

  req.sessionStore = options.store;

  req.session = new Session(
    req,
    res,
    req.sessionId ? await req.sessionStore.get(req.sessionId) : null,
    options
  );

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
