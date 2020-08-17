import { parse as parseCookie } from 'cookie';
import { nanoid } from 'nanoid';
import MemoryStore from './store/memory';
import Session from './session';
import { Options, SessionOptions } from './types';
import { IncomingMessage, ServerResponse } from 'http';

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

export async function applySession<T = {}>(
  req: IncomingMessage & { session: Session<T> },
  res: ServerResponse,
  opts?: Options
): Promise<void> {
  const options = getOptions(opts);

  if (req.session) return;

  let sessId = req.headers && req.headers.cookie
    ? parseCookie(req.headers.cookie)[options.name]
    : null;

  if (sessId && typeof options.decode === 'function') {
    sessId = await options.decode(sessId);
  }

  (req as any).sessionStore = options.store;

  const sess = sessId ? await options.store.get(sessId) : null;
  if (sess) sess.id = sessId;
  req.session = new Session<T>(res, options, sess);


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
