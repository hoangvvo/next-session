import { applySession } from './core';
import { Options } from './types';
import { IncomingMessage, ServerResponse } from 'http';
import Session from './session';

let storeReady = true;

export default function session<T = {}>(opts?: Options) {
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
    req: IncomingMessage & { session: Session<T> },
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
