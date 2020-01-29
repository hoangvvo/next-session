import { promisify } from 'util';
import { applySession, getOptions } from './core';

let storeReady = true;

export default function session(opts = {}) {
  const options = getOptions(opts);

  const { store, storePromisify } = options;
  //  Promisify callback-based store.
  if (storePromisify) {
    store.get = promisify(store.get);
    store.set = promisify(store.set);
    store.destroy = promisify(store.destroy);
    if (typeof store.touch === 'function') store.touch = promisify(store.touch);
  }
  //  store readiness
  store.on('disconnect', () => {
    storeReady = false;
  });
  store.on('connect', () => {
    storeReady = true;
  });

  return async (req, res, next) => {
    if (req.session || !storeReady) { next(); return; }
    //  TODO: add pathname mismatch check
    await applySession(req, res, options);
    next();
  };
}
