const Store = require('../store');

const MemoryStoreSession = {};

module.exports = class MemoryStore extends Store {
  // eslint-disable-next-line no-useless-constructor
  constructor() {
    super();
    this.sessions = MemoryStoreSession;
  }

  get(sid) {
    const self = this;

    let expires;
    let sess = this.sessions[sid];
    if (sess) {
      sess = JSON.parse(sess);

      //  converting string Date to Date()
      expires =
        typeof sess.cookie.expires === 'string'
          ? new Date(sess.cookie.expires)
          : sess.cookie.expires;

      if (!expires || Date.now() < expires) {
        //  check expires before returning
        return Promise.resolve(sess);
      }

      self.destroy(sid);
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }

  set(sid, sess) {
    this.sessions[sid] = JSON.stringify(sess);
    return Promise.resolve();
  }

  touch(sid, session) {
    return this.get(sid).then(sess => {
      if (sess) {
        const newSess = {
          ...sess,
          cookie: session.cookie,
        };
        return this.set(sid, newSess);
      }
      return undefined;
    });
  }

  all() {
    const arr = [];
    const keys = Object.keys(this.sessions);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      arr.push(this.sessions[keys[i]]);
    }
    return Promise.resolve(arr);
  }

  destroy(sid) {
    delete this.sessions[sid];
    return Promise.resolve();
  }
};
