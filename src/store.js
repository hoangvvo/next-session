import { inherits } from 'util';
import EventEmitter from 'events';
import Session from './session';
import Cookie from './cookie';

export default function Store() {
  EventEmitter.call(this);
}

inherits(Store, EventEmitter);

Store.prototype.generate = function generate(req, res, genId, cookieOptions) {
  req.sessionId = genId;
  req.session = new Session(req, res);
  req.session.cookie = new Cookie(cookieOptions);
  return req.session;
};

Store.prototype.createSession = function createSession(req, res, sess) {
  const thisSess = sess;
  const { expires } = thisSess.cookie;
  thisSess.cookie = new Cookie(thisSess.cookie);
  if (typeof expires === 'string') thisSess.cookie.expires = new Date(expires);
  req.session = new Session(req, res, thisSess);
  return req.session;
};
