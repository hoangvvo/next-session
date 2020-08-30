import { parse as parseCookie, serialize } from 'cookie';
import { nanoid } from 'nanoid';
import { Store as ExpressStore } from 'express-session';
import MemoryStore from './store/memory';
import { Options, SessionOptions, SessionData, SessionStore, CookieOptions, SessionCookieData, NormalizedSessionStore } from './types';
import { IncomingMessage, ServerResponse } from 'http';
import { promisify } from 'util';

let memoryStore: MemoryStore;

export function isCallbackStore<E extends ExpressStore, S extends SessionStore>(
  store: E | S
): store is E {
  return store.get.length === 2;
}

const shouldTouch = (options: SessionOptions, cookie: SessionCookieData) => (options.touchAfter !== -1 &&
  cookie.maxAge !== null &&
  cookie.expires &&
  // Session must be older than touchAfter
  cookie.maxAge * 1000 -
    (cookie.expires.getTime() - Date.now()) >=
    options.touchAfter)

export const getCookieData = (options: (CookieOptions | SessionCookieData) & {
  expires?: Date | string | null;
}) => {
  const c: SessionCookieData = {
    path: options.path || '/',
    maxAge: options.maxAge || null,
    httpOnly: options.httpOnly || true,
    domain: options.domain || undefined,
    sameSite:options.sameSite,
    secure: options.secure || false
  }
  if (options.expires)
      c.expires =
        typeof options.expires === 'string'
          ? new Date(options.expires)
          : options.expires;
    else if (c.maxAge)
      c.expires = new Date(Date.now() + c.maxAge * 1000);
    return c;
}

function getOptions(opts?: Options): SessionOptions {
  return {
    name: opts?.name || 'sid',
    store: setupStore(opts?.store || (memoryStore = memoryStore || new MemoryStore())),
    genid: opts?.genid || nanoid,
    encode: opts?.encode,
    decode: opts?.decode,
    rolling: opts?.rolling || false,
    touchAfter: opts?.touchAfter ? opts.touchAfter : 0,
    cookie: opts?.cookie || {},
    autoCommit: typeof opts?.autoCommit !== 'undefined' ? opts.autoCommit : true,
  }
}

function stringify(sess: SessionData) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

function setupStore(store: SessionStore | ExpressStore) {
  const normalizedStore = (store as unknown as NormalizedSessionStore)
  if (isCallbackStore(store)) {
    normalizedStore.__destroy = promisify(store.destroy).bind(store);
    // @ts-ignore
    normalizedStore.__get = promisify(store.get).bind(store);
     // @ts-ignore
    normalizedStore.__set = promisify(store.set).bind(store);
     // @ts-ignore
    if (store.touch) normalizedStore.__touch = promisify(store.touch).bind(store);
  } else {
    normalizedStore.__destroy = store.destroy;
    normalizedStore.__get = store.get;
    normalizedStore.__set = store.set;
    normalizedStore.__touch = store.touch;
  }
  return normalizedStore
}

export async function applySession<T = {}>(
  req: IncomingMessage & { session: SessionData },
  res: ServerResponse,
  opts?: Options
): Promise<void> {
  if (req.session) return;

  const options = getOptions(opts);

  let sessId =
    req.headers && req.headers.cookie
      ? parseCookie(req.headers.cookie)[options.name]
      : null;

  if (sessId && options.decode) {
    sessId = options.decode(sessId);
  }

  (req as any).sessionStore = options.store;

  let sess: SessionData | null | undefined;

  if (sessId) sess = await options.store.__get(sessId);

  if (sess) {
    const { cookie, ...data } = sess;
    req.session = {cookie: getCookieData(cookie)};
    for (const key in data) {
      req.session[key] = data[key]
    }
  } else {
    req.session = { cookie: getCookieData(options.cookie) }
  }

  req.session = Object.assign({ id: sessId }, sess, { cookie: getCookieData(sess?.cookie || options.cookie) })

  const prevSessStr: string | undefined = sess ? stringify(sess) : (req.session.isNew = true && undefined)

  const commitHead = () => {
    if (res.headersSent || !req.session) return;
    if (req.session.isNew || (options.rolling && shouldTouch(options, req.session.cookie))) {
      res.setHeader(
        'Set-Cookie',
        serialize(
          options.name,
          options.encode ? options.encode(req.session.id) : req.session.id
        )
      );
    }
  }

  const save = async () => {
    if (!req.session) return;
    const obj: SessionData = {} as any;

    for (const key in req.session) {
      if (!(key === ('isNew' || key === 'id')))
        obj[key] = req.session[key]
    }
    if (stringify(req.session) !== prevSessStr) {
      await options.store.__set(req.session.id, obj)
    } else if (shouldTouch(options, req.session.cookie)) {
      if (req.session.expires && req.session.maxAge) {
        req.session.expires = new Date(Date.now() + req.session.maxAge * 1000);
      }
      await options.store.__touch?.(req.session.id, obj)
    }
  }

  req.session.commit = async () => {
    commitHead();
    await save();
  }

  req.session.destroy = async () => {
    await options.store.__destroy(req.session.id)
    delete req.session;
  }

  // autocommit
  if (options.autoCommit) {
    const oldWritehead = res.writeHead;
    res.writeHead = function resWriteHeadProxy(...args: any) {
      commitHead();
      return oldWritehead.apply(this, args);
    };
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args: any) {
      await save();
      oldEnd.apply(this, args);
    };
  }
}
