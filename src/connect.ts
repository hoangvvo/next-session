import { applySession } from './core';
import { Options, Response, Request } from './types';

let storeReady = true;

export default function session(opts: Options) {
  //  store readiness
  if (opts?.store?.on) {
    opts.store.on('disconnect', () => {
      storeReady = false;
    });
    opts.store.on('connect', () => {
      storeReady = true;
    });
  }
  return (req: Request, res: Response, next: (err?: any) => void) => {
    if (!storeReady) {
      next();
      return;
    }
    applySession(req, res, opts).then(next);
  };
}
