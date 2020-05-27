interface CookieOptions {
  aut
}

export interface Options {
  name?: string;

  genId?: () => string;
  encode?: (rawSid: string) => string;
  decode?: (encryptedSid: string) => string;
  rolling?: boolean;
  touchAfter?: number;
  cookie?: CookieOptions;
  autoCommit?: boolean;
}
