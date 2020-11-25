import { applySession } from './core';
import { Options } from './types';
import { IncomingMessage, ServerResponse } from 'http';

let storeReady = true;

export default function session(opts?: Options) {
  //  store readiness
  if (opts && opts.store && opts.store.on) {
    opts.store.on('disconnect', () => {
      storeReady = false;
    });
    opts.store.on('connect', () => {
      storeReady = true;
    });
  }
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: any) => void
  ) => {
    if (!storeReady) {
      next();
      return;
    }
    applySession(req, res, opts).then(next);
  };
}
