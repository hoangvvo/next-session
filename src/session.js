import { stringify } from './core';

export default class Session {
  constructor(req, res, sess) {
    Object.defineProperty(this, 'req', { value: req });
    Object.defineProperty(this, 'res', { value: res });
    Object.defineProperty(this, 'id', { value: req.sessionId });
    if (typeof sess === 'object') {
      Object.assign(this, sess);
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
      if (!this.cookie.maxAge && touchAfter === 0) return false;
      const elapsed =
        this.cookie.maxAge * 1000 - (this.cookie.expires - new Date());
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
      this.res.setHeader(
        'Set-Cookie',
        this.cookie.serialize(name, this.req.sessionId)
      );
    }
  }
}
