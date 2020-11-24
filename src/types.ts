import { Store as ExpressStore } from 'express-session';

export type SessionData = {
  [key: string]: any;
  id: string;
  cookie: SessionCookieData;
  destroy: () => Promise<void>;
  isNew: boolean;
};

export type SessionCookieData = {
  path: string;
  secure: boolean;
  httpOnly: boolean;
  domain?: string | undefined;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
} & ({ maxAge: number, expires: Date } | { maxAge: null, expires?: undefined })

export abstract class SessionStore {
  abstract get: (sid: string) => Promise<SessionData | null>;
  abstract set: (sid: string, sess: SessionData) => Promise<void>;
  abstract destroy: (sid: string) => Promise<void>;
  abstract touch?: (sid: string, sess: SessionData) => Promise<void>;
  on?: (event: string | symbol, listener: (...args: any[]) => void) => this;
}

export interface NormalizedSessionStore {
  [key: string]: any;
  __get: (sid: string) => Promise<SessionData | null>;
  __set: (sid: string, sess: SessionData) => Promise<void>;
  __destroy: (sid: string) => Promise<void>;
  __touch?: (sid: string, sess: SessionData) => Promise<void>;
  __normalized: true,
}

export interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  maxAge?: number | null;
}

export interface Options {
  name?: string;
  store?: SessionStore | ExpressStore;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
  touchAfter?: number;
  cookie?: CookieOptions;
  autoCommit?: boolean;
  /**
   * @deprecated
   */
  rolling?: boolean;
}
