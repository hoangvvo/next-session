import { applySession } from './core';

export default function session(opts) {
  return (req, res, next) => {
    applySession(req, res, opts).then(() => next());
  };
}
