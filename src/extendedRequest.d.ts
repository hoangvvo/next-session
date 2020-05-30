import { Session, IStore, SessionOptions } from '.';

declare module 'http' {
  export interface IncomingMessage {
    sessionId?: string | null;
    _sessId?: string | null;
    session: Session;
    _sessOpts: SessionOptions;
    _sessStr: string;
    sessionStore: IStore;
  }
}
