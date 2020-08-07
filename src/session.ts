import { Request, Response, SessionData } from './types';
import Cookie from './cookie';
import { SessionOptions } from './types';

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
  _committed: boolean;
  isNew: boolean;
}

class Session {
  cookie: Cookie;
  [key: string]: any;
  constructor(
    req: Request,
    res: Response,
    sess: SessionData | null,
    options: SessionOptions
  ) {
    Object.defineProperties(this, {
      req: { value: req },
      res: { value: res },
      _opts: { value: options },
      _committed: { value: false, writable: true },
      isNew: { value: false, writable: true }
    });
    if (sess) {
      Object.assign(this, sess);
      this.cookie = new Cookie(sess.cookie);
    } else {
      this.isNew = true;
      // Create new session
      this.cookie = new Cookie(this._opts.cookie);
      req.sessionId = options.genid();
    }
    Object.defineProperties(this, {
      id: { value: req.sessionId },
      _sessStr: { value: stringify(this) },
    });
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
    this.isNew = true;
    delete this.req.session;
    return this._opts.store.destroy(this.id);
  }

  async commit() {
    if (this._committed) return;
    this._committed = true;
    const { name, rolling, touchAfter } = this._opts;
    let touched = false;
    let saved = false;
    // Check if session is mutated
    if (stringify(this) !== this._sessStr) {
      saved = true;
      await this.save();
    }
    const shouldTouch =
      touchAfter !== -1 &&
      this.cookie.maxAge !== null &&
      this.cookie.expires &&
      // Session must be older than touchAfter
      this.cookie.maxAge * 1000 -
        (this.cookie.expires.getTime() - Date.now()) >=
        touchAfter;
    if (!saved && shouldTouch) {
      touched = true;
      await this.touch();
    }
    // Check if new cookie should be set
    if ((rolling && touched) || this.isNew) {
      if (this.res.headersSent) return;
      this.res.setHeader(
        'Set-Cookie',
        this.cookie.serialize(
          name,
          typeof this._opts.encode === 'function'
            ? await this._opts.encode(this.id)
            : this.id
        )
      );
    }
  }
}

export default Session;
