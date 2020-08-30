import { parse as parseCookie, serialize } from "cookie";
import { nanoid } from "nanoid";
import { Store as ExpressStore } from "express-session";
import MemoryStore from "./store/memory";
import {
  Options,
  SessionOptions,
  SessionData,
  SessionStore,
  CookieOptions,
  SessionCookieData,
  NormalizedSessionStore,
} from "./types";
import { IncomingMessage, ServerResponse } from "http";
import { promisify } from "util";

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

export const getCookieData = (
  options: (CookieOptions | SessionCookieData) & {
    expires?: Date | string | null;
  }
) => {
  const c: SessionCookieData = {
    path: options.path || "/",
    maxAge: options.maxAge || null,
    httpOnly: options.httpOnly || true,
    domain: options.domain || undefined,
    sameSite: options.sameSite,
    secure: options.secure || false,
  };
  if (options.expires)
    c.expires =
      typeof options.expires === "string"
        ? new Date(options.expires)
        : options.expires;
  else if (c.maxAge) c.expires = new Date(Date.now() + c.maxAge * 1000);
  return c;
};

const stringify = (sess: SessionData) =>
  JSON.stringify(sess, (key, val) => (key === "cookie" ? undefined : val));

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
      "Set-Cookie",
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
    if (!(key === ("isNew" || key === "id"))) obj[key] = req.session[key];
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
      normalizedStore.__touch = promisify(store.touch).bind(store);
  } else {
    s.__destroy = store.destroy.bind(store);
    s.__get = store.get.bind(store);
    s.__set = store.set.bind(store);
    s.__touch = store.touch?.bind(store);
  }
  return s;
}

export async function applySession<T = {}>(
  req: IncomingMessage & { session: SessionData },
  res: ServerResponse,
  opts?: Options
): Promise<void> {
  if (req.session) return;

  const options: SessionOptions = {
    name: opts?.name || "sid",
    store: setupStore(opts?.store || new MemoryStore()),
    genid: opts?.genid || nanoid,
    encode: opts?.encode,
    decode: opts?.decode,
    rolling: opts?.rolling || false,
    touchAfter: opts?.touchAfter ? opts.touchAfter : 0,
    cookie: opts?.cookie || {},
    autoCommit:
      typeof opts?.autoCommit !== "undefined" ? opts.autoCommit : true,
  };

  let sessId =
    req.headers && req.headers.cookie
      ? parseCookie(req.headers.cookie)[options.name]
      : null;

  if (sessId && options.decode) sessId = options.decode(sessId);

  const sess = sessId ? await options.store.__get(sessId) : null;

  if (sess) {
    const { cookie, ...data } = sess;
    req.session = { cookie: getCookieData(cookie) };
    for (const key in data) req.session[key] = data[key];
  } else {
    req.session = { cookie: getCookieData(options.cookie) };
  }

  req.session = Object.assign({ id: sessId }, sess, {
    cookie: getCookieData(sess?.cookie || options.cookie),
  });

  const prevSessStr: string | undefined = sess
    ? stringify(sess)
    : (req.session.isNew = true && undefined);

  req.session.commit = async () => {
    commitHead(req, res, options);
    await save(req, prevSessStr, options);
  };

  req.session.destroy = async () => {
    await options.store.__destroy(req.session.id);
    delete req.session;
  };

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
