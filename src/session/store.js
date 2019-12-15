import util from 'util';
import EventEmitter from 'events';
import Session from './session';
import Cookie from './cookie';

export default function Store() {
  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

Store.prototype.generate = function generate(req, genId, cookieOptions) {
  req.sessionId = genId;
  req.session = new Session(req);
  req.session.cookie = new Cookie(cookieOptions);
  return req.session;
};

Store.prototype.createSession = function createSession(req, sess) {
  const thisSess = sess;
  const { expires } = thisSess.cookie;
  thisSess.cookie = new Cookie(thisSess.cookie);
  if (typeof expires === 'string') thisSess.cookie.expires = new Date(expires);
  req.session = new Session(req, thisSess);
  return req.session;
};
