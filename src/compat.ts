import { promisify, callbackify, inherits } from 'util';
import { EventEmitter } from 'events';
import { Store as ExpressStore } from 'express-session';
import { IStore } from './types';
import MemoryStore from './store/memory';

function Store() {
  // @ts-ignore
  EventEmitter.call(this);
}
inherits(Store, EventEmitter);
// no-op for compat

function expressSession(options?: any): any {}

expressSession.Store = Store;

function CallbackMemoryStore() {}
inherits(CallbackMemoryStore, Store);
CallbackMemoryStore.prototype.get = callbackify(MemoryStore.prototype.get);
CallbackMemoryStore.prototype.set = callbackify(MemoryStore.prototype.set);
CallbackMemoryStore.prototype.destroy = callbackify(
  MemoryStore.prototype.destroy
);
CallbackMemoryStore.prototype.all = callbackify(MemoryStore.prototype.all);

expressSession.MemoryStore = CallbackMemoryStore;

export { expressSession };

export function promisifyStore(
  store: Pick<ExpressStore, 'get' | 'destroy' | 'set'> & Partial<ExpressStore>
): IStore {
  store.get = promisify(store.get);
  store.set = promisify(store.set);
  store.destroy = promisify(store.destroy);
  if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  return store as IStore;
}
