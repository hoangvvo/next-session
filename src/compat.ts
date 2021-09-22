import { EventEmitter } from "events";
import { callbackify, inherits } from "util";
import MemoryStore from "./memory-store";

// no-op for compat
function expressSession(options?: any): any {}

function ExpressStore(this: any) {
  EventEmitter.call(this);
}
inherits(ExpressStore, EventEmitter);
expressSession.Store = ExpressStore;

function CallbackMemoryStore(this: MemoryStore) {
  this.store = new Map();
}
inherits(CallbackMemoryStore, ExpressStore);
CallbackMemoryStore.prototype.get = callbackify(MemoryStore.prototype.get);
CallbackMemoryStore.prototype.set = callbackify(MemoryStore.prototype.set);
CallbackMemoryStore.prototype.destroy = callbackify(
  MemoryStore.prototype.destroy
);

expressSession.MemoryStore = CallbackMemoryStore;

export default expressSession;
