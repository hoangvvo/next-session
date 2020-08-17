/// <reference types="next" />
/// <reference types="next/types/global" />
declare module 'http' {
  export interface IncomingMessage {
    session: Session;
  }
}
