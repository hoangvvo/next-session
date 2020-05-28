import { inherits } from 'util';
import { EventEmitter } from 'events';

function Store() {
  // @ts-ignore
  EventEmitter.call(this);
}
inherits(Store, EventEmitter);
// no-op for compat

export default Store;
