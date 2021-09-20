import { EventEmitter } from 'events';
import { callbackify, inherits } from 'util';
import MemoryStore from './store/memory';

// no-op for compat
function expressSession(options?: any): any {}

function ExpressStore() {
  // @ts-ignore
  EventEmitter.call(this);
}
inherits(ExpressStore, EventEmitter);
expressSession.Store = ExpressStore;

function CallbackMemoryStore() {
  // @ts-ignore
  this.store = new Map();
}
inherits(CallbackMemoryStore, ExpressStore);
CallbackMemoryStore.prototype.get = callbackify(MemoryStore.prototype.get);
CallbackMemoryStore.prototype.set = callbackify(MemoryStore.prototype.set);
CallbackMemoryStore.prototype.destroy = callbackify(
  MemoryStore.prototype.destroy
);

expressSession.MemoryStore = CallbackMemoryStore;

export { expressSession };

export function promisifyStore(store: any) {
  console.warn(
    'promisifyStore has been deprecated: express-session store still works without using this.'
  );
  return store;
}
