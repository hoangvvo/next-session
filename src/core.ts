import { parse, serialize } from 'cookie';
import { Store as ExpressStore } from 'express-session';
import { IncomingMessage, ServerResponse } from 'http';
import { nanoid } from 'nanoid';
import MemoryStore from './store/memory';
import {
  NormalizedSessionStore,
  Options,
  Session,
  SessionData,
  SessionStore
} from './types';

const stringify = (sess: SessionData | null | undefined) =>
  JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val));

const commitHead = (
  res: ServerResponse,
  name: string,
  session: SessionData | null | undefined,
  touched: boolean,
  encodeFn?: Options['encode']
) => {
  if (res.headersSent || !session) return;
  if (session.isNew || touched) {
    const cookieArr = [
      serialize(name, encodeFn ? encodeFn(session.id) : session.id, {
        path: session.cookie.path,
        httpOnly: session.cookie.httpOnly,
        expires: session.cookie.expires,
        domain: session.cookie.domain,
        sameSite: session.cookie.sameSite,
        secure: session.cookie.secure,
      }),
    ];
    const prevCookies = res.getHeader('set-cookie');
    if (prevCookies) {
      if (Array.isArray(prevCookies)) cookieArr.push(...prevCookies);
      else cookieArr.push(prevCookies as string);
    }
    res.setHeader('set-cookie', cookieArr);
  }
};

const prepareSession = (session: SessionData) => {
  const obj: SessionData = {} as any;
  for (const key in session)
    !(key === ('isNew' || key === 'id')) && (obj[key] = session[key]);
  return obj;
};

const save = async (
  store: NormalizedSessionStore,
  session: SessionData | null | undefined
) => session && store.__set(session.id, prepareSession(session));

function setupStore(
  store: SessionStore | ExpressStore | NormalizedSessionStore
) {
  if ('__get' in store) return store;
  const s = store as unknown as NormalizedSessionStore;

  s.__destroy = function destroy(sid) {
    return new Promise((resolve, reject) => {
      const done = (err: any) => (err ? reject(err) : resolve());
      const result = this.destroy(sid, done);
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  };

  s.__get = function get(sid) {
    return new Promise((resolve, reject) => {
      const done = (err: any, val: SessionData | null | undefined) =>
        err ? reject(err) : resolve(val);
      // @ts-ignore: Certain differences between express-session type and ours
      const result = this.get(sid, done);
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  };

  s.__set = function set(sid, sess) {
    return new Promise((resolve, reject) => {
      const done = (err: any) => (err ? reject(err) : resolve());
      // @ts-ignore: Certain differences between express-session type and ours
      const result = this.set(sid, sess, done);
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  };

  if (store.touch) {
    s.__touch = function touch(sid, sess) {
      return new Promise((resolve, reject) => {
        const done = (err: any) => (err ? reject(err) : resolve());
        // @ts-ignore: Certain differences between express-session type and ours
        const result = this.touch!(sid, sess, done);
        if (result && typeof result.then === 'function')
          result.then(resolve, reject);
      });
    };
  }
  return s;
}

let memoryStore: MemoryStore;

export async function applySession<T = {}>(
  req: IncomingMessage & { session?: Session | null | undefined },
  res: ServerResponse,
  options: Options = {}
): Promise<void> {
  if (req.session) return;

  // This allows both promised-based and callback-based store to work
  const store: NormalizedSessionStore = setupStore(
    options.store || (memoryStore = memoryStore || new MemoryStore())
  );

  // compat: if rolling is `true`, user might have wanted to touch every time
  // thus defaulting options.touchAfter to 0 instead of -1
  if (options.rolling && !('touchAfter' in options)) {
    console.warn(
      'The use of options.rolling is deprecated. Setting this to `true` without options.touchAfter causes options.touchAfter to be defaulted to `0` (always)'
    );
    options.touchAfter = 0;
  }

  const name = options.name || 'sid';

  const commit = async () => {
    commitHead(res, name, req.session, shouldTouch, options.encode);
    await save(store, req.session);
  };

  const destroy = async () => {
    await store.__destroy(req.session!.id);
    req.session = null;
  };

  let sessId =
    req.headers && req.headers.cookie ? parse(req.headers.cookie)[name] : null;
  if (sessId && options.decode) sessId = options.decode(sessId);

  // @ts-ignore: req.session as this point is not of type Session
  // but SessionData, but the missing keys will be added later
  req.session = sessId ? await store.__get(sessId) : null;

  if (req.session) {
    req.session.commit = commit;
    req.session.destroy = destroy;
    req.session.isNew = false;
    req.session.id = sessId!;
    // Some store return cookie.expires as string, convert it to Date
    if (typeof req.session.cookie.expires === 'string')
      req.session.cookie.expires = new Date(req.session.cookie.expires);
  } else {
    req.session = {
      cookie: {
        path: options.cookie?.path || '/',
        httpOnly: options.cookie?.httpOnly || true,
        domain: options.cookie?.domain || undefined,
        sameSite: options.cookie?.sameSite,
        secure: options.cookie?.secure || false,
        ...(options.cookie?.maxAge
          ? { maxAge: options.cookie.maxAge, expires: new Date() }
          : { maxAge: null }),
      },
      commit,
      destroy,
      isNew: true,
      id: (options.genid || nanoid)(),
    };
  }

  // prevSessStr is used to compare the session later
  // for touchability -- that is, we only touch the
  // session if it has changed. This check is used
  // in autoCommit mode only
  const prevSessStr: string | undefined =
    options.autoCommit !== false
      ? req.session.isNew
        ? '{}'
        : stringify(req.session)
      : undefined;

  let shouldTouch = false;

  if (req.session.cookie.maxAge) {
    if (
      // Extend expires either if it is a new session
      req.session.isNew ||
      // or if touchAfter condition is satsified
      (typeof options.touchAfter === 'number' &&
        options.touchAfter !== -1 &&
        (shouldTouch =
          req.session.cookie.maxAge * 1000 -
            (req.session.cookie.expires.getTime() - Date.now()) >=
          options.touchAfter))
    ) {
      req.session.cookie.expires = new Date(
        Date.now() + req.session.cookie.maxAge * 1000
      );
    }
  }

  // autocommit: We commit the header and save the session automatically
  // by "proxying" res.writeHead and res.end methods. After committing, we
  // call the original res.writeHead and res.end.
  if (options.autoCommit !== false) {
    const oldWritehead = res.writeHead;
    res.writeHead = function resWriteHeadProxy(...args: any) {
      commitHead(res, name, req.session, shouldTouch, options.encode);
      return oldWritehead.apply(this, args);
    };
    const oldEnd = res.end;
    res.end = function resEndProxy(...args: any) {
      const onSuccess = () => oldEnd.apply(this, args);
      if (stringify(req.session) !== prevSessStr) {
        save(store, req.session).finally(onSuccess);
      } else if (req.session && shouldTouch && store.__touch) {
        store
          .__touch(req.session!.id, prepareSession(req.session!))
          .finally(onSuccess);
      } else {
        onSuccess();
      }
    };
  }

  // Compat
  (req as any).sessionStore = store;
}
