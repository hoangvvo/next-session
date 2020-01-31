import { applySession } from './core';

let storeReady = true;

export default function session(opts) {
  //  store readiness
  if (opts && opts.store) {
    opts.store.on('disconnect', () => {
      storeReady = false;
    });
    opts.store.on('connect', () => {
      storeReady = true;
    });
  }
  return (req, res, next) => {
    if (!storeReady) {
      next();
      return;
    }
    applySession(req, res, opts).then(() => next());
  };
}
