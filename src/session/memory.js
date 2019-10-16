/* eslint-disable class-methods-use-this */

const Store = require('./store');

const MemoryStoreSession = {};

class MemoryStore extends Store {
  // eslint-disable-next-line no-useless-constructor
  constructor() {
    super();
  }

  get(sid) {
    const self = this;

    let expires;
    let sess = MemoryStoreSession[sid];
    if (sess) {
      sess = JSON.parse(sess);

      //  converting string Date to Date()
      expires = typeof sess.cookie.expires === 'string'
        ? new Date(sess.cookie.expires)
        : sess.cookie.expires;

      if (!expires || new Date() < expires) {
        //  check expires before returning
        return Promise.resolve(sess);
      }

      self.destroy(sid);
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }

  set(sid, sess) {
    MemoryStoreSession[sid] = JSON.stringify(sess);
    return Promise.resolve();
  }

  touch(sid, sess) {
    if (MemoryStoreSession[sid]) {
      MemoryStoreSession[sid].cookie = sess.cookie;
    }
    return Promise.resolve();
  }

  all() {
    const arr = [];
    const keys = Object.keys(MemoryStoreSession);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      arr.push(MemoryStoreSession[keys[i]]);
    }
    return Promise.resolve(arr);
  }

  destroy(sid) {
    Promise.resolve(delete MemoryStoreSession[sid]);
  }
}

module.exports = MemoryStore;
