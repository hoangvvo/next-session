import { promisify } from 'util';
import { StoreInterface } from './types';
import * as session from 'express-session';

export function promisifyStore(store: Pick<session.Store, 'get' | 'destroy' | 'set'> & Partial<session.Store>): StoreInterface {
  store.get = promisify(store.get);
  store.set = promisify(store.set);
  store.destroy = promisify(store.destroy);
  if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  return store as StoreInterface;
}
