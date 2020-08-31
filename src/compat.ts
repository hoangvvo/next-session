import { callbackify, inherits } from 'util';
import { EventEmitter } from 'events';
import { Store as ExpressStore } from 'express-session';
import MemoryStore from './store/memory';

export function Store() {
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

export function promisifyStore(store: ExpressStore): ExpressStore {
  console.warn('promisifyStore has been deprecated! You can simply remove it.');
  return store;
}
