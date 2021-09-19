import { EventEmitter } from 'events';
import { Store as ExpressStore } from 'express-session';
import { callbackify, inherits } from 'util';
import MemoryStore from './store/memory';

// no-op for compat
function expressSession(options?: any): any {}

function CompatibleStore() {
  // @ts-ignore
  EventEmitter.call(this);
}
inherits(CompatibleStore, EventEmitter);
expressSession.Store = CompatibleStore;

function CallbackMemoryStore() {}
inherits(CallbackMemoryStore, CompatibleStore);
CallbackMemoryStore.prototype.get = callbackify(MemoryStore.prototype.get);
CallbackMemoryStore.prototype.set = callbackify(MemoryStore.prototype.set);
CallbackMemoryStore.prototype.destroy = callbackify(
  MemoryStore.prototype.destroy
);
CallbackMemoryStore.prototype.all = callbackify(MemoryStore.prototype.all);

expressSession.MemoryStore = CallbackMemoryStore;

export { expressSession };

export function promisifyStore(store: ExpressStore): ExpressStore {
  console.warn(
    'promisifyStore has been deprecated: express-session store still works without using this.'
  );
  return store;
}
