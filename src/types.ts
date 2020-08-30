import { Store as ExpressStore } from 'express-session';

export type SessionData = {
  [key: string]: any;
  cookie: SessionCookieData;
};

export interface SessionCookieData {
  path: string;
  maxAge: number | null;
  secure: boolean;
  httpOnly: boolean;
  domain?: string | undefined;
  expires?: Date;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

export abstract class SessionStore {
  abstract get: (sid: string) => Promise<SessionData | null>;
  abstract set: (sid: string, sess: SessionData) => Promise<void>;
  abstract destroy: (sid: string) => Promise<void>;
  abstract touch?: (sid: string, sess: SessionData) => Promise<void>;
  on?: (event: string | symbol, listener: (...args: any[]) => void) => this;
}

export interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface Options {
  name?: string;
  store?: SessionStore | ExpressStore;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
  rolling?: boolean;
  touchAfter?: number;
  cookie?: CookieOptions;
  autoCommit?: boolean;
}

export type SessionOptions = Omit<Required<Options>, 'encode' | 'decode'> & Pick<Options, 'encode' | 'decode'>
