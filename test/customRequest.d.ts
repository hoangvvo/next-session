import { Session, StoreInterface } from "../src";

declare module "http" {
  export interface IncomingMessage {
    session: Session
    sessionStore: StoreInterface
    sessionId: string
  }
}
