import { Store } from '../types';
import Session from '../session';
const MemoryStoreSession = {};

export default class MemoryStore implements Store {
  sessions: Record<string, string>;
  constructor() {
    this.sessions = MemoryStoreSession;
  }

  get(sid: string) {
    const self = this;

    let sess = this.sessions[sid];
    if (sess) {
      const session = JSON.parse(sess, (key, value) => key === 'expires' ? new Date(value) : value);
      if (!session.expires || Date.now() < session.expires) {
        //  check expires before returning
        return Promise.resolve(session);
      }

      self.destroy(sid);
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }

  set(sid: string, sess: Session) {
    this.sessions[sid] = JSON.stringify(sess);
    return Promise.resolve();
  }

  touch(sid: string, session: Session) {
    return this.get(sid).then(sess => {
      if (sess) {
        const newSess = {
          ...sess,
          cookie: session.cookie
        };
        return this.set(sid, newSess);
      }
      return undefined;
    });
  }

  all() {
    const arr = [];
    const keys = Object.keys(this.sessions);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      arr.push(this.sessions[keys[i]]);
    }
    return Promise.resolve(arr);
  }

  destroy(sid: string) {
    delete this.sessions[sid];
    return Promise.resolve();
  }
}
