import { stringify } from './core';
import { Request, Response } from './types';
import Cookie from './cookie';

export default class Session {
  id: string;
  cookie: Cookie;
  [key: string]: any;
  constructor(private readonly req: Request, private readonly res: Response, sess?: Session) {
    this.id = req.sessionId as string;
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
      return this.req._sessId !== this.req.sessionId;
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
          ? await this.req._sessOpts.encode(this.req.sessionId as string)
          : this.req.sessionId as string
      this.res.setHeader(
        'Set-Cookie',
        this.cookie.serialize(name, sessionId)
      );
    }
  }
}
