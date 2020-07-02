import { Request, Response, SessionData } from './types';
import Cookie from './cookie';
import { SessionOptions } from '.';

function stringify(sess: Session) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

declare interface Session {
  id: string;
  req: Request;
  res: Response;
  _opts: SessionOptions;
  _sessStr: string;
  isNew: boolean;
}

class Session {
  cookie: Cookie;
  //[key: string]: any;
  constructor(req: Request, res: Response, sess: SessionData | null, options: SessionOptions) {
    Object.defineProperty(this, 'req', { value: req });
    Object.defineProperty(this, 'res', { value: res });
    Object.defineProperty(this, '_opts', { value: options });
    let isNew = false;
    if (sess) {
      Object.assign(this, sess);
      this.cookie = new Cookie(sess.cookie);
    } else {
      isNew = true;
      // Create new session
      this.cookie = new Cookie(this._opts.cookie);
      req.sessionId = options.genid();
    }
    Object.defineProperty(this, 'isNew', {value: isNew })
    Object.defineProperty(this, 'id', { value: req.sessionId });
    Object.defineProperty(this, '_sessStr', { value: stringify(this) })
  }

  //  touch the session
  touch() {
    this.cookie.resetExpires();
    //  check if store supports touch()
    if (typeof this._opts.store.touch === 'function') {
      return this._opts.store.touch(this.id, this);
    }
    return Promise.resolve();
  }

  //  sessionStore to set this Session
  save() {
    this.cookie.resetExpires();
    return this._opts.store.set(this.id, this);
  }

  destroy() {
    delete this.req.session;
    return this._opts.store.destroy(this.id);
  }

  async commit() {
    const { name, rolling, touchAfter } = this._opts;
    let touched = false;
    let saved = false;

    const shouldSave = () => stringify(this) !== this._sessStr;
    const shouldTouch = () => {
      if (!this.cookie.maxAge || !this.cookie.expires || touchAfter === -1)
        return false;
      const elapsed =
        this.cookie.maxAge * 1000 -
        (this.cookie.expires.getTime() - Date.now());
      return elapsed >= touchAfter;
    };
    const shouldSetCookie = () => (rolling && touched) || this.isNew;

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
        typeof this._opts.encode === 'function'
          ? await this._opts.encode(this.id)
          : this.id;
      this.res.setHeader('Set-Cookie', this.cookie.serialize(name, sessionId));
    }
  }
}

export default Session;
