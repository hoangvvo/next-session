import { parse, serialize } from 'cookie';
import { nanoid } from 'nanoid';
import { Store as ExpressStore } from 'express-session';
import { IncomingMessage, ServerResponse } from 'http';
import { promisify } from 'util';
import MemoryStore from './store/memory';
import {
  Options,
  SessionOptions,
  SessionData,
  SessionStore,
  SessionCookieData,
  NormalizedSessionStore,
} from './types';

function isCallbackStore<E extends ExpressStore, S extends SessionStore>(
  store: E | S
): store is E {
  return store.get.length === 2;
}

const shouldTouch = (options: SessionOptions, cookie: SessionCookieData) =>
  options.touchAfter !== -1 &&
  cookie.maxAge !== null &&
  cookie.expires &&
  // Session must be older than touchAfter
  cookie.maxAge * 1000 - (cookie.expires.getTime() - Date.now()) >=
    options.touchAfter;

const stringify = (sess: SessionData) =>
  JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val));

const commitHead = (
  req: IncomingMessage & { session?: SessionData | null },
  res: ServerResponse,
  options: SessionOptions
) => {
  if (res.headersSent || !req.session) return;
  if (
    req.session.isNew ||
    (options.rolling && shouldTouch(options, req.session.cookie))
  ) {
    res.setHeader(
      'Set-Cookie',
      serialize(
        options.name,
        options.encode ? options.encode(req.session.id) : req.session.id
      )
    );
  }
};

const save = async (
  req: IncomingMessage & { session?: SessionData | null },
  prevSessStr: string | undefined,
  options: SessionOptions
) => {
  if (!req.session) return;
  const obj: SessionData = {} as any;
  for (const key in req.session) {
    if (!(key === ('isNew' || key === 'id'))) obj[key] = req.session[key];
  }
  if (stringify(req.session) !== prevSessStr) {
    await options.store.__set(req.session.id, obj);
  } else if (shouldTouch(options, req.session.cookie)) {
    if (req.session.expires && req.session.maxAge) {
      req.session.expires = new Date(Date.now() + req.session.maxAge * 1000);
    }
    await options.store.__touch?.(req.session.id, obj);
  }
};

function setupStore(store: SessionStore | ExpressStore) {
  const s = (store as unknown) as NormalizedSessionStore;
  if (isCallbackStore(store)) {
    s.__destroy = promisify(store.destroy).bind(store);
    // @ts-ignore
    s.__get = promisify(store.get).bind(store);
    // @ts-ignore
    s.__set = promisify(store.set).bind(store);
    if (store.touch)
      // @ts-ignore
      s.__touch = promisify(store.touch).bind(store);
  } else {
    s.__destroy = store.destroy.bind(store);
    s.__get = store.get.bind(store);
    s.__set = store.set.bind(store);
    s.__touch = store.touch?.bind(store);
  }
  return s;
}

let memoryStore: MemoryStore;

export async function applySession<T = {}>(
  req: IncomingMessage & { session: SessionData },
  res: ServerResponse,
  opts?: Options
): Promise<void> {
  if (req.session) return;

  const options: SessionOptions = {
    name: opts?.name || 'sid',
    store: setupStore(opts?.store || (memoryStore = memoryStore || new MemoryStore())),
    genid: opts?.genid || nanoid,
    encode: opts?.encode,
    decode: opts?.decode,
    rolling: opts?.rolling || false,
    touchAfter: opts?.touchAfter ? opts.touchAfter : 0,
    cookie: {
      path: opts?.cookie?.path || '/',
      maxAge: opts?.cookie?.maxAge || null,
      httpOnly: opts?.cookie?.httpOnly || true,
      domain: opts?.cookie?.domain || undefined,
      sameSite: opts?.cookie?.sameSite,
      secure: opts?.cookie?.secure || false,
    },
    autoCommit:
      typeof opts?.autoCommit !== 'undefined' ? opts.autoCommit : true,
  };

  let sessId =
    req.headers && req.headers.cookie
      ? parse(req.headers.cookie)[options.name]
      : null;

  if (sessId && options.decode) sessId = options.decode(sessId);

  const sess = sessId ? await options.store.__get(sessId) : null;

  const commit = async () => {
    commitHead(req, res, options);
    await save(req, prevSessStr, options);
  };

  const destroy = async () => {
    await options.store.__destroy(req.session.id);
    delete req.session;
  };

  if (sess) {
    const { cookie, ...data } = sess;

    if (cookie.expires)
      cookie.expires =
        typeof cookie.expires === 'string'
          ? new Date(cookie.expires)
          : cookie.expires;
    else if (cookie.maxAge)
      cookie.expires = new Date(Date.now() + cookie.maxAge * 1000);

    req.session = {
      cookie,
      commit,
      destroy,
      isNew: false,
      id: sessId!,
    };
    for (const key in data) req.session[key] = data[key];
  } else {
    req.session = {
      cookie: options.cookie,
      commit,
      destroy,
      isNew: true,
      id: nanoid(),
    };
  }

  const prevSessStr: string | undefined = sess ? stringify(sess) : undefined;

  // autocommit
  if (options.autoCommit) {
    const oldWritehead = res.writeHead;
    res.writeHead = function resWriteHeadProxy(...args: any) {
      commitHead(req, res, options);
      return oldWritehead.apply(this, args);
    };
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args: any) {
      await save(req, prevSessStr, options);
      oldEnd.apply(this, args);
    };
  }

  // Compat
  (req as any).sessionStore = options.store;
}
