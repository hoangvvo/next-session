import { Session, IStore, SessionOptions } from '.';

declare module 'http' {
  export interface IncomingMessage {
    sessionId: string | null;
    session: Session;
    sessionStore: IStore;
  }
}
