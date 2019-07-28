import * as cookie from 'cookie';
import parseToMs from './utils';

class Cookie {
  constructor(options) {
    //  Set parameters
    this.path = options.path || '/';
    this.maxAge = options.maxAge ? parseToMs(options.maxAge) : null;
    this.httpOnly = options.httpOnly || true;
    this.domain = options.domain || null;
    this.sameSite = options.sameSite || null;
    this.secure = options.secure || false;
    // set expires based on maxAge
    if (this.maxAge) this.expires = new Date(Date.now() + this.maxAge);
  }

  //  reset expires to prolong session cookie (typically in every request)
  resetExpires() {
    if (this.expires && this.maxAge) { this.expires = new Date(Date.now() + this.maxAge); }
  }

  //  cookie options as an object
  get cookieOptions() {
    return {
      path: this.path,
      httpOnly: this.httpOnly,
      expires: this.expires || null,
      domain: this.domain,
      sameSite: this.sameSite,
      secure: this.secure,
    };
  }

  //  cookie serialize to use for set header
  serialize(name, val) {
    return cookie.serialize(name, val, this.cookieOptions);
  }
}

export default Cookie;
