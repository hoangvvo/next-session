import { Store as IExpressStore } from 'express-session';

export type SessionData = {
  [key: string]: any;
  cookie: SessionCookieData;
};

export interface Session extends SessionData {
  id: string;
  commit(): Promise<void>;
  destroy(): Promise<void>;
  isNew: boolean;
}

export type SessionCookieData = {
  httpOnly: boolean;
  path: string;
  domain?: string | undefined;
  secure: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
} & (
  | { maxAge: undefined; expires?: undefined }
  | {
      maxAge: number;
      expires: Date;
    }
);

export abstract class SessionStore {
  abstract get(sid: string): Promise<SessionData | null | undefined>;
  abstract set(sid: string, sess: SessionData): Promise<void>;
  abstract destroy(sid: string): Promise<void>;
  abstract touch?(sid: string, sess: SessionData): Promise<void>;
}

export interface Options {
  name?: string;
  store?: SessionStore | IExpressStore;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string | null;
  touchAfter?: number;
  cookie?: Partial<
    Pick<
      SessionCookieData,
      'maxAge' | 'httpOnly' | 'path' | 'domain' | 'secure' | 'sameSite'
    >
  >;
  autoCommit?: boolean;
  /**
   * @deprecated
   */
  rolling?: boolean;
}
