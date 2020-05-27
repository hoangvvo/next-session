import { IncomingMessage, ServerResponse } from "http";
import Session from "./session";
import { EventEmitter } from "events";
import { NextApiRequest, NextApiResponse } from "next";

export abstract class StoreInterface {
  abstract get: (sid: string) => Promise<Session | null>;
  abstract set: (sid: string, sess: Session) => Promise<void>
  abstract destroy: (sid: string) => Promise<void>
  abstract touch?: (sid: string, sess: Session) => Promise<void>
  on?: EventEmitter['on']
  [key: string]: any;
}

export interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  maxAge?: number;
}

export interface Options {
  name?: string;
  store?: StoreInterface;
  genid?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
  rolling?: boolean;
  touchAfter?: number;
  cookie?: CookieOptions;
  autoCommit?: boolean;
}

export type SessionOptions = Pick<Required<Options>, 'name' | 'store' | 'genid' | 'rolling' | 'touchAfter' | 'cookie' | 'autoCommit'> & {
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
};

export type Request = (IncomingMessage | NextApiRequest) & { [key: string]: any }

export type RequestWithSession = Request & {
  sessionId: string;
  _sessId: string;
  session: Session;
  _sessOpts: SessionOptions;
  _sessStr: string;
  sessionStore: StoreInterface;
};

export type Response = ServerResponse | NextApiResponse;
