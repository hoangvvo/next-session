import { promisify } from 'util';
import { StoreInterface } from './types';
import { Store as ExpressStore }from 'express-session';

export function promisifyStore(store: Pick<ExpressStore, 'get' | 'destroy' | 'set'> & Partial<ExpressStore>): StoreInterface {
  store.get = promisify(store.get);
  store.set = promisify(store.set);
  store.destroy = promisify(store.destroy);
  if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  return store as StoreInterface;
}
