/* eslint-disable class-methods-use-this */

const MemoryStoreSession = {};

class MemoryStore {
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
        return sess;
      }

      self.destroy(sid);
      return null;
    }
    return null;
  }

  set(sid, sess) {
    MemoryStoreSession[sid] = JSON.stringify(sess);
  }

  all() {
    const arr = [];
    const keys = Object.keys(MemoryStoreSession);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      arr.push(MemoryStoreSession[keys[i]]);
    }
    return arr;
  }

  destroy(sid) {
    return delete MemoryStoreSession[sid];
  }
}

export default MemoryStore;
