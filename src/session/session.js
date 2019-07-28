import merge from 'lodash.merge';

class Session {
  constructor(req, sess) {
    Object.defineProperty(this, 'req', { value: req });
    Object.defineProperty(this, 'id', { value: req.sessionId });
    if (typeof sess === 'object') {
      merge(this, sess);
    }
  }

  //  touch the session
  touch() {
    this.cookie.resetExpires();
    //  check if store supports touch()
    if (typeof this.req.sessionStore.touch === 'function') {
      return this.req.sessionStore.touch(this.id, this);
    }
    //  eslint-disable-next-line no-console
    console.warn('store does not implement touch()');
    return Promise.resolve();
  }

  //  sessionStore to set this Session
  save() {
    this.cookie.resetExpires();
    return this.req.sessionStore.set(this.id, this);
  }

  destroy() {
    delete this.req.session;
    return this.req.sessionStore.destroy(this.id);
  }
}

export default Session;
