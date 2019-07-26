import merge from 'lodash.merge';

class Session {
  constructor(req, sess) {
    Object.defineProperty(this, 'req', { value: req });
    // Object.defineProperty(this, 'id', { value: req.sessionId });
    this.id = req.sessionId;
    if (typeof sess === 'object') {
      merge(this, sess);
    }
  }

  //  sessionStore to set this Session
  save() {
    return this.req.sessionStore.set(this.id, this);
  }

  destroy() {
    delete this.req.session;
    return this.req.sessionStore.destroy(this.id);
  }
}

export default Session;
