import { SessionData } from './types';
import Cookie from './cookie';
import { SessionOptions } from './types';
import { IncomingMessage, ServerResponse } from 'http';

function stringify(sess: SessionData) {
  return JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
}

declare interface Session<T extends { [key: string]: any } = {}> {
  id: string;
  res: ServerResponse;
  _opts: SessionOptions;
  _sessStr: string;
  isNew: boolean;
  isDestroy: boolean;
  // https://github.com/Microsoft/TypeScript/pull/26797
  [field: string]: any;
}

class Session<T = {}> {
  cookie: Cookie;
  constructor(
    res: ServerResponse,
    options: SessionOptions,
    prevSess: SessionData | null
  ) {
    if (prevSess) Object.assign(this, prevSess);
    this.cookie = new Cookie(prevSess ? prevSess.cookie : options.cookie);
    Object.defineProperties(this, {
      id: { value: prevSess?.id || options.genid() },
      res: { value: res },
      _opts: { value: options },
      isNew: { value: !prevSess, writable: true },
      isDestroyed: { value: false, writable: true },
      _sessStr: { value: prevSess ? stringify(prevSess) : '{}' },
    });
  }

  //  touch the session
  touch() {
    this.cookie.resetExpires();
    //  check if store supports touch()
    if (this._opts.store.touch) {
      return this._opts.store.touch(this.id, this);
    }
    return Promise.resolve();
  }

  //  sessionStore to set this Session
  save() {
    // session had been destroyed. do nothing
    if (this.isDestroy) return Promise.resolve();
    if (stringify(this) !== this._sessStr) {
      // session has changed
      this.cookie.resetExpires();
      return this._opts.store.set(this.id, this);
    } else if (this.shouldTouch()) {
      // session hasn't changed, try touch
      return this.touch();
    }
  }

  destroy() {
    this.isDestroy = true;
    return this._opts.store.destroy(this.id);
  }

  shouldTouch() {
    return this._opts.touchAfter !== -1 &&
      this.cookie.maxAge !== null &&
      this.cookie.expires &&
      // Session must be older than touchAfter
      this.cookie.maxAge * 1000 -
        (this.cookie.expires.getTime() - Date.now()) >=
        this._opts.touchAfter
  }

  commitHead() {
    // Header sent, cannot commit
    if (this.res.headersSent) return;
    // Check if new cookie should be set
    if ((this._opts.rolling && this.shouldTouch()) || this.isNew) {
      this.res.setHeader(
        'Set-Cookie',
        this.cookie.serialize(
          this._opts.name,
          this._opts.encode
            ? this._opts.encode(this.id)
            : this.id
        )
      );
    }
  }

  async commit() {
    this.commitHead();
    await this.save();
  }
}

export default Session;
