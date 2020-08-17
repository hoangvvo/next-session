import { SessionData } from './types';
import Cookie from './cookie';
import { SessionOptions } from './types';
import { IncomingMessage, ServerResponse } from 'http';

function stringify(sess: SessionData) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

declare interface Session<T = {}> {
  id: string;
  req: IncomingMessage & { session: Session<T> };
  res: ServerResponse;
  _opts: SessionOptions;
  _sessStr: string;
  isNew: boolean;
}

class Session<T = {}> {
  cookie: Cookie;
  [key: string]: any;
  constructor(
    req: IncomingMessage & { session: Session<T> },
    res: ServerResponse,
    options: SessionOptions,
    prevSess: SessionData | null
  ) {
    if (prevSess) Object.assign(this, prevSess);
    this.cookie = new Cookie(prevSess ? prevSess.cookie : options.cookie);
    Object.defineProperties(this, {
      id: { value: prevSess?.id || options.genid() },
      req: { value: req },
      res: { value: res },
      _opts: { value: options },
      isNew: { value: !prevSess, writable: true },
      _sessStr: { value: prevSess ? stringify(prevSess) : '{}' },
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
