import { applySession } from './core';

export default function session(opts = {}) {
  return async (req, res, next) => {
    await applySession(req, res, opts);
    next();
  };
}
