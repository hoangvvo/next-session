import { isDestroyed, isNew, isTouched } from "./symbol";

export type SessionData = {
  [key: string]: any;
  cookie: Cookie;
};

export interface Session extends SessionData {
  id: string;
  touch(): void;
  commit(): Promise<void>;
  destroy(): Promise<void>;
  [isNew]?: boolean;
  [isTouched]?: boolean;
  [isDestroyed]?: boolean;
}

type Cookie = {
  httpOnly: boolean;
  path: string;
  domain?: string | undefined;
  secure: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
} & (
  | { maxAge?: undefined; expires?: undefined }
  | {
      maxAge: number;
      expires: Date;
    }
);

export interface SessionStore {
  get(sid: string): Promise<SessionData | null | undefined>;
  set(sid: string, sess: SessionData): Promise<void>;
  destroy(sid: string): Promise<void>;
  touch?(sid: string, sess: SessionData): Promise<void>;
}

export interface Options {
  name?: string;
  store?: SessionStore;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string | null;
  touchAfter?: number;
  cookie?: Partial<
    Pick<
      Cookie,
      "maxAge" | "httpOnly" | "path" | "domain" | "secure" | "sameSite"
    >
  >;
  autoCommit?: boolean;
}
