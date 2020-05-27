import { serialize } from 'cookie';
import { CookieOptions } from './types';

export default class Cookie {
  path: string;
  maxAge?: number;
  httpOnly: boolean;
  domain: string | undefined;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure: boolean;
  expires?: Date;
  constructor(options: CookieOptions & { expires?: string | Date | null }) {
    //  Set parameters
    this.path = options.path || '/';
    this.maxAge = options.maxAge;
    this.httpOnly = options.httpOnly || true;
    this.domain = options.domain || undefined;
    this.sameSite = options.sameSite;
    this.secure = options.secure || false;
    // set expires based on maxAge (in seconds)
    if (options.expires) this.expires = typeof options.expires === 'string' ? new Date(options.expires) : options.expires;
    else if (this.maxAge) this.expires = new Date(Date.now() + this.maxAge * 1000);
  }

  //  reset expires to prolong session cookie (typically in every request)
  resetExpires() {
    if (this.expires && this.maxAge) {
      this.expires = new Date(Date.now() + this.maxAge * 1000);
    }
  }

  //  cookie options as an object
  get cookieOptions() {
    return {
      path: this.path,
      httpOnly: this.httpOnly,
      expires: this.expires,
      domain: this.domain,
      sameSite: this.sameSite,
      secure: this.secure
    };
  }

  //  cookie serialize to use for set header
  serialize(name: string, val: string) {
    return serialize(name, val, this.cookieOptions);
  }
}
