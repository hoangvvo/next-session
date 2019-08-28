/* eslint-disable class-methods-use-this */
const EventEmitter = require('events');
const Session = require('./session');
const Cookie = require('./cookie');

class Store extends EventEmitter {
  constructor() {
    super();
    EventEmitter.call(this);
  }

  generate(req, genId, cookieOptions) {
    req.sessionId = genId;
    req.session = new Session(req);
    req.session.cookie = new Cookie(cookieOptions);
    return req.session;
  }

  createSession(req, sess) {
    const thisSess = sess;
    const { expires } = thisSess.cookie;
    thisSess.cookie = new Cookie(thisSess.cookie);
    if (typeof expires === 'string') thisSess.cookie.expires = new Date(expires);
    req.session = new Session(req, thisSess);
    return req.session;
  }
}

module.exports = Store;
