const { parseToMs } = require('./utils');

function stringify(sess) { return JSON.stringify(sess, (key, val) => (key === 'cookie' ? undefined : val)); }

class Session {
  constructor(req, sess) {
    Object.defineProperty(this, 'req', { value: req });
    Object.defineProperty(this, 'id', { value: req.sessionId });
    if (typeof sess === 'object') {
      Object.assign(this, sess);
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

  async commit(res) {
    const { name } = this.req.sessionOpts;
    const rollingSession = this.req.sessionOpts.rolling || false;
    const touchAfter = this.req.sessionOpts.touchAfter
      ? parseToMs(this.req.sessionOpts.touchAfter)
      : 0;

    let saved = false;

    if (stringify(this) !== stringify(this.req.originalSession)) {
      await this.save();
      saved = true;
    }
    //  Touch: extend session time despite no modification
    if (this.cookie.maxAge && touchAfter >= 0) {
      const minuteSinceTouched = (
        this.cookie.maxAge
          - (this.cookie.expires - new Date())
      );
      if ((minuteSinceTouched >= touchAfter)) await this.touch();
    }

    if (
      (saved || rollingSession || this.req.cookies[name] !== this.req.sessionId)
        && this
    ) res.setHeader('Set-Cookie', this.cookie.serialize(name, this.req.sessionId));
  }
}

module.exports = Session;
