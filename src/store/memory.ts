import { EventEmitter } from 'events';
import { SessionData, SessionStore } from '../types.js';

export default class MemoryStore extends EventEmitter implements SessionStore {
  public sessions: Record<string, string> = {};

  constructor() {
    super();
  }

  get(sid: string): Promise<SessionData | null> {
    const self = this;

    const sess = this.sessions[sid];
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
        return Promise.resolve(session);
      }

      self.destroy(sid);
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }

  set(sid: string, sess: SessionData) {
    this.sessions[sid] = JSON.stringify(sess);
    return Promise.resolve();
  }

  touch(sid: string, session: SessionData) {
    return this.set(sid, session);
  }

  all() {
    return Promise.resolve(Object.values(this.sessions));
  }

  destroy(sid: string) {
    delete this.sessions[sid];
    return Promise.resolve();
  }
}
