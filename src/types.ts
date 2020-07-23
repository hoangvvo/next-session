import type Session from "./session";
import { IncomingMessage, ServerResponse } from "http";

declare module "http" {
  export interface IncomingMessage {
    sessionId: string | null;
    session: Session;
    sessionStore: SessionStore;
  }
}

export type SessionData = {
  [key: string]: any;
  cookie: SessionCookieData;
};

export interface SessionCookieData {
  path: string;
  maxAge: number | null;
  httpOnly: boolean;
  domain?: string | undefined;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure: boolean;
  expires?: Date;
}

export abstract class SessionStore {
  abstract get: (sid: string) => Promise<SessionData | null>;
  abstract set: (sid: string, sess: SessionData) => Promise<void>;
  abstract destroy: (sid: string) => Promise<void>;
  abstract touch?: (sid: string, sess: SessionData) => Promise<void>;
  [key: string]: any;
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
  store?: SessionStore;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
  rolling?: boolean;
  touchAfter?: number;
  cookie?: CookieOptions;
  autoCommit?: boolean;
}

export type SessionOptions = Pick<
  Required<Options>,
  | 'name'
  | 'store'
  | 'genid'
  | 'rolling'
  | 'touchAfter'
  | 'cookie'
  | 'autoCommit'
> & {
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
};

export type Request = IncomingMessage;

export type Response = ServerResponse;
