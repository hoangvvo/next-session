import { promisify } from 'util';
import Session from './session';
import { StoreInterface } from './types';

interface CallbackStore {
  get: (
    sid: string,
    callback: (err: any, session?: Session | null) => void
  ) => void;
  set: (sid: string, session: Session, callback: (err?: any) => void) => void;
  touch?: (
    sid: string,
    session: Session,
    callback: (err?: any) => void
  ) => void;
  destroy: (sid: string, callback: (err?: any) => void) => void;
  [key: string]: any;
}

export function promisifyStore(store: CallbackStore): StoreInterface {
  store.get = promisify(store.get);
  store.set = promisify(store.set);
  store.destroy = promisify(store.destroy);
  if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  return store as StoreInterface;
}
