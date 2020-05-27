import { stringify } from './core';
import { Response, RequestWithSession } from './types';
import Cookie from './cookie';

declare interface Session {
  id: string;
  req: RequestWithSession;
  res: Response
}

class Session {
  cookie: Cookie;
  [key: string]: any;
  constructor(req: RequestWithSession, res: Response, sess?: Session) {
    Object.defineProperty(this, 'id', { value: req.sessionId });
    Object.defineProperty(this, 'req', { value: req });
    Object.defineProperty(this, 'res', { value: res });
    if (sess) {
      Object.assign(this, sess);
      this.cookie = new Cookie(sess.cookie);
    } else {
      this.cookie = new Cookie(req._sessOpts.cookie);
    }
  }

  //  touch the session
  touch() {
    this.cookie.resetExpires();
    //  check if store supports touch()
    if (typeof this.req.sessionStore.touch === 'function') {
      return this.req.sessionStore.touch(this.id, this);
    }
    return Promise.resolve();
  }

  //  sessionStore to set this Session
  save() {
    this.cookie.resetExpires();
    return this.req.sessionStore.set(this.id, this);
  }

  destroy() {
    delete this.req.session;
    return this.req.sessionStore.destroy(this.id);
  }

  async commit() {
    const { name, rolling, touchAfter } = this.req._sessOpts;
    let touched = false;
    let saved = false;

    const shouldSave = () =>
      stringify(this) !== this.req._sessStr;
    const shouldTouch = () => {
      if (!this.cookie.maxAge || !this.cookie.expires || touchAfter === 0) return false;
      const elapsed =
        this.cookie.maxAge * 1000 - (this.cookie.expires.getTime() - Date.now());
      return elapsed >= touchAfter;
    };
    const shouldSetCookie = () => {
      if (rolling && touched) return true;
      return this.req._sessId !== this.id;
    };

    if (shouldSave()) {
      saved = true;
      await this.save();
    }
    if (!saved && shouldTouch()) {
      touched = true;
      await this.touch();
    }
    if (shouldSetCookie()) {
      if (this.res.headersSent) return;
      const sessionId =
        typeof this.req._sessOpts.encode === 'function'
          ? await this.req._sessOpts.encode(this.id)
          : this.id
      this.res.setHeader(
        'Set-Cookie',
        this.cookie.serialize(name, sessionId)
      );
    }
  }
}

export default Session;
