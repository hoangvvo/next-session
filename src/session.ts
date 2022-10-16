import c from "cookie";
import { IncomingMessage, ServerResponse } from "http";
import { nanoid } from "nanoid";
import MemoryStore from "./memory-store";
import { isDestroyed, isNew, isTouched } from "./symbol";
import { Options, Session, SessionRecord } from "./types";
import { commitHeader, hash } from "./utils";

export default function session<T extends SessionRecord = SessionRecord>(options: Options = {}) {
  type TypedSession = Session<T>;

  const name = options.name || "sid";
  const store = options.store || new MemoryStore();
  const genId = options.genid || (() => nanoid());
  const encode = options.encode;
  const decode = options.decode;
  const touchAfter = options.touchAfter ?? -1;
  const autoCommit = options.autoCommit ?? true;
  const cookieOpts = options.cookie || {};

  function decorateSession(
    req: IncomingMessage & { session?: TypedSession },
    res: ServerResponse,
    session: TypedSession,
    id: string,
    _now: number
  ) {
    Object.defineProperties(session, {
      commit: {
        value: async function commit(this: TypedSession) {
          commitHeader(res, name, this, encode);
          await store.set(this.id, this);
        },
      },
      touch: {
        value: async function commit(this: TypedSession) {
          this.cookie.expires = new Date(_now + this.cookie.maxAge! * 1000);
          this[isTouched] = true;
        },
      },
      destroy: {
        value: async function destroy(this: TypedSession) {
          this[isDestroyed] = true;
          this.cookie.expires = new Date(1);
          await store.destroy(this.id);
          if (!autoCommit) commitHeader(res, name, this, encode);
          delete req.session;
        },
      },
      id: { value: id },
    });
  }

  return async function sessionHandle(
    req: IncomingMessage & { session?: TypedSession },
    res: ServerResponse
  ): Promise<TypedSession> {
    if (req.session) return req.session;

    const _now = Date.now();

    let sessionId = req.headers?.cookie
      ? c.parse(req.headers.cookie)[name]
      : null;
    if (sessionId && decode) {
      sessionId = decode(sessionId);
    }

    const _session = sessionId ? await store.get(sessionId) : null;

    let session: TypedSession;
    if (_session) {
      session = _session as TypedSession;
      // Some store return cookie.expires as string, convert it to Date
      if (typeof session.cookie.expires === "string") {
        session.cookie.expires = new Date(session.cookie.expires);
      }

      // Add session methods
      decorateSession(req, res, session, sessionId as string, _now);

      // Extends the expiry of the session if options.touchAfter is sastified
      if (touchAfter >= 0 && session.cookie.expires) {
        const lastTouchedTime =
          session.cookie.expires.getTime() - session.cookie.maxAge * 1000;
        if (_now - lastTouchedTime >= touchAfter * 1000) {
          session.touch();
        }
      }
    } else {
      sessionId = genId(req);
      session = {
        [isNew]: true,
        cookie: {
          path: cookieOpts.path || "/",
          httpOnly: cookieOpts.httpOnly ?? true,
          domain: cookieOpts.domain || undefined,
          sameSite: cookieOpts.sameSite,
          secure: cookieOpts.secure || false,
        },
      } as TypedSession;
      if (cookieOpts.maxAge) {
        session.cookie.maxAge = cookieOpts.maxAge;
        session.cookie.expires = new Date(_now + cookieOpts.maxAge * 1000);
      }

      // Add session methods
      decorateSession(req, res, session, sessionId, _now);
    }

    req.session = session;

    // prevSessStr is used to compare the session later
    // in autoCommit -- that is, we only save the
    // session if it has changed.
    let prevHash: string | undefined;
    if (autoCommit) {
      prevHash = hash(session);
    }

    // autocommit: We commit the header and save the session automatically
    // by "proxying" res.writeHead and res.end methods. After committing, we
    // call the original res.writeHead and res.end.
    if (autoCommit) {
      const _writeHead = res.writeHead;
      res.writeHead = function resWriteHeadProxy(...args: any) {
        // Commit the header if either:
        // - session is new and has been populated
        // - session is flagged to commit header (touched or destroyed)
        if (
          (session[isNew] && Object.keys(session).length > 1) ||
          session[isTouched] ||
          session[isDestroyed]
        ) {
          commitHeader(res, name, session, encode);
        }
        return _writeHead.apply(this, args);
      };
      const _end = res.end;
      res.end = function resEndProxy(...args: any) {
        const done = () => _end.apply(this, args);
        if (session[isDestroyed]) {
          done();
        } else if (hash(session) !== prevHash) {
          store.set(session.id, session).finally(done);
        } else if (session[isTouched] && store.touch) {
          store.touch(session.id, session).finally(done);
        } else {
          done();
        }
      };
    }

    return session;
  };
}

export type { Options, SessionStore } from "./types";
