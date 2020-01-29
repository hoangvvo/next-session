import * as cookie from './cookie';

export default class Cookie {
  constructor(options) {
    //  Set parameters
    Object.assign(this, {
      path: '/',
      maxAge: null,
      httpOnly: true,
      domain: null,
      sameSite: null,
      secure: false,
    }, options);
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
