import { SessionStore, SessionData } from '../types';
import { EventEmitter } from 'events';

const s: Record<string, string> = {}

export default class MemoryStore extends EventEmitter implements SessionStore {
  constructor() {
    super();
  }

  get(sid: string): Promise<SessionData | null> {
    const self = this;

    const sess = s[sid];
    if (sess) {
      const session = JSON.parse(sess);
      session.cookie.expires = session.cookie.expires
        ? new Date(session.cookie.expires)
        : null;

      if (
        !session.cookie.expires ||
        Date.now() < session.cookie.expires.getTime()
      ) {
        //  check expires before returning
        return Promise.resolve(session as SessionData);
      }

      self.destroy(sid);
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }

  set(sid: string, sess: SessionData) {
    s[sid] = JSON.stringify(sess);
    return Promise.resolve();
  }

  touch(sid: string, session: SessionData) {
    return this.get(sid).then((sess) => {
      if (sess) {
        const newSess = {
          ...sess,
          cookie: session.cookie,
        };
        return this.set(sid, newSess);
      }
      return undefined;
    });
  }

  all() {
    const arr = [];
    const keys = Object.keys(s);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      arr.push(s[keys[i]]);
    }
    return Promise.resolve(arr);
  }

  destroy(sid: string) {
    delete s[sid];
    return Promise.resolve();
  }
}
