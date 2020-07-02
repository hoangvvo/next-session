import { Session, IStore, SessionOptions } from '.';

declare module 'http' {
  export interface IncomingMessage {
    sessionId: string | null;
    _sessId: string | null;
    session: Session;
    sessionStore: IStore;
  }
}
