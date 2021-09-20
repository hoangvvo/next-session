import { parse, serialize } from 'cookie';
import { Store as ExpressStore } from 'express-session';
import { IncomingMessage, ServerResponse } from 'http';
import { nanoid } from 'nanoid';
import MemoryStore from './store/memory';
import { Options, Session, SessionData, SessionStore } from './types';

const hash = (sess: SessionData) =>
  JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val));

const commitHead = (
  res: ServerResponse,
  name: string,
  { cookie, id }: SessionData,
  encodeFn?: Options['encode']
) => {
  if (res.headersSent) return;
  const cookieArr = [
    serialize(name, encodeFn ? encodeFn(id) : id, {
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      expires: cookie.expires,
      domain: cookie.domain,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
    }),
  ];
  const prevCookies = res.getHeader('set-cookie');
  if (prevCookies) {
    if (Array.isArray(prevCookies)) cookieArr.push(...prevCookies);
    else cookieArr.push(prevCookies as string);
  }
  res.setHeader('set-cookie', cookieArr);
};

const storeFn = {
  destroy(s: ExpressStore | SessionStore, sid: string) {
    return new Promise<void>((resolve, reject) => {
      const result = s.destroy(sid, (err) => (err ? reject(err) : resolve()));
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  },
  get(s: ExpressStore | SessionStore, sid: string) {
    return new Promise<SessionData | null | undefined>((resolve, reject) => {
      const result = s.get(sid, (err, val) =>
        // @ts-ignore: Compat diff
        err ? reject(err) : resolve(val)
      );
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  },
  set(s: ExpressStore | SessionStore, sid: string, sess: SessionData) {
    return new Promise<void>((resolve, reject) => {
      // @ts-ignore: Compat diff
      const result = s.set(sid, sess, (err) => (err ? reject(err) : resolve()));
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  },
  touch(s: ExpressStore | SessionStore, sid: string, sess: SessionData) {
    return new Promise<void>((resolve, reject) => {
      const done = (err: any) => (err ? reject(err) : resolve());
      // @ts-ignore: Compat diff
      const result = s.touch!(sid, sess, done);
      if (result && typeof result.then === 'function')
        result.then(resolve, reject);
    });
  },
};

let memoryStore: MemoryStore;

export async function applySession<T = {}>(
  req: IncomingMessage & { session?: Session },
  res: ServerResponse,
  options: Options = {}
): Promise<void> {
  if (req.session) return;

  /**
   * Options init
   */
  const name = options.name || 'sid';
  const store =
    options.store || (memoryStore = memoryStore || new MemoryStore());
  const genId = options.genid || nanoid;
  const encode = options.encode;
  const decode = options.decode;
  let touchAfter = -1;
  // compat: if rolling is `true`, user might have wanted to touch every time
  // thus defaulting options.touchAfter to 0 instead of -1
  if (options.rolling && !('touchAfter' in options)) {
    console.warn(
      'The use of options.rolling is deprecated. Setting this to `true` without options.touchAfter causes options.touchAfter to be defaulted to `0` (always)'
    );
    touchAfter = 0;
  }
  if (typeof options.touchAfter === 'number') {
    touchAfter = options.touchAfter;
  }
  const autoCommit =
    typeof options.autoCommit === 'boolean' ? options.autoCommit : true;
  const cookieOpts = options?.cookie || {};

  /**
   * Main
   */

  let isDestroyed = false;
  let isTouched = false;

  const _now = Date.now();
  const resetMaxAge = (session: Session) => {
    isTouched = true;
    session.cookie.expires = new Date(_now + session.cookie.maxAge! * 1000);
  };

  let sessId =
    req.headers && req.headers.cookie ? parse(req.headers.cookie)[name] : null;
  if (sessId && decode) sessId = decode(sessId);

  const loadedSess = sessId ? await storeFn.get(store, sessId) : null;

  let session: Session;

  if (loadedSess) {
    session = loadedSess as Session;
    // Some store return cookie.expires as string, convert it to Date
    if (typeof session.cookie.expires === 'string') {
      session.cookie.expires = new Date(session.cookie.expires);
    }
  } else {
    sessId = genId();
    session = {
      cookie: {
        path: cookieOpts.path || '/',
        httpOnly: cookieOpts.httpOnly || true,
        domain: cookieOpts.domain || undefined,
        sameSite: cookieOpts.sameSite,
        secure: cookieOpts.secure || false,
        ...(cookieOpts.maxAge
          ? {
              maxAge: cookieOpts.maxAge,
              expires: new Date(_now + cookieOpts.maxAge * 1000),
            }
          : { maxAge: undefined }),
      },
    } as Session;
  }

  Object.defineProperties(session, {
    commit: {
      value: async function commit(this: Session) {
        commitHead(res, name, this, encode);
        await storeFn.set(store, this.id, this);
      },
    },
    destroy: {
      value: async function destroy(this: Session) {
        isDestroyed = true;
        this.cookie.expires = new Date(1);
        await storeFn.destroy(store, this.id);
        delete req.session;
      },
    },
    isNew: { value: !loadedSess },
    id: { value: sessId as string },
  });

  // Set to req.session
  req.session = session;
  // Compat with express-session
  (req as any).sessionStore = store;

  // prevSessStr is used to compare the session later
  // for touchability -- that is, we only touch the
  // session if it has changed. This check is used
  // in autoCommit mode only
  let prevHash: string | undefined;
  if (autoCommit) {
    prevHash = hash(session);
  }

  // Extends the expiry of the session
  // if touchAfter is applicable
  if (touchAfter >= 0 && session.cookie.expires) {
    const lastTouchedTime =
      session.cookie.expires.getTime() - session.cookie.maxAge * 1000;
    if (_now - lastTouchedTime >= touchAfter) {
      resetMaxAge(session);
    }
  }

  // autocommit: We commit the header and save the session automatically
  // by "proxying" res.writeHead and res.end methods. After committing, we
  // call the original res.writeHead and res.end.

  if (autoCommit) {
    const oldWritehead = res.writeHead;
    res.writeHead = function resWriteHeadProxy(...args: any) {
      if (session.isNew || isTouched || isDestroyed) {
        commitHead(res, name, session, encode);
      }
      return oldWritehead.apply(this, args);
    };
    const oldEnd = res.end;
    res.end = function resEndProxy(...args: any) {
      const done = () => oldEnd.apply(this, args);
      if (isDestroyed) return done();
      if (hash(session) !== prevHash) {
        storeFn.set(store, session.id, session).finally(done);
      } else if (isTouched && store.touch) {
        storeFn.touch(store, session.id, session).finally(done);
      } else {
        done();
      }
    };
  }
}
