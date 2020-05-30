import { promisify, inherits } from 'util';
import { EventEmitter } from 'events';
import { Store as ExpressStore }from 'express-session';
import { StoreInterface } from './types';
import session from './connect';
import { MemoryStore } from '.';

function Store() {
  // @ts-ignore
  EventEmitter.call(this);
}
inherits(Store, EventEmitter);
// no-op for compat

function expressSession(options?: any): any {
  return session(options);
}

expressSession.Store = Store;
expressSession.MemoryStore = MemoryStore;

export { expressSession };

export function promisifyStore(store: Pick<ExpressStore, 'get' | 'destroy' | 'set'> & Partial<ExpressStore>): StoreInterface {
  store.get = promisify(store.get);
  store.set = promisify(store.set);
  store.destroy = promisify(store.destroy);
  if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  return store as StoreInterface;
}
