const EventEmitter = require('events');
const crypto = require('crypto');
const Store = require('../lib/session/store');

describe('Store', () => {
  test('should extend EventEmitter', () => {
    expect(new Store()).toBeInstanceOf(EventEmitter);
  });

  test('should be able to generate Session and convert String() expires to Date() expires on createSession', () => {
    const store = new Store();
    const req = {};
    let sess = store.generate(req, crypto.randomBytes(16).toString('hex'), { maxAge: 100000 });
    //  force sess.cookie.expires to be string
    sess = JSON.parse(JSON.stringify(sess));
    store.createSession(req, sess);
    expect(req.session.cookie.expires).toBeInstanceOf(Date);
  });

  test('should allow store subclasses to use Store.call(this)', () => {
    // Some express-compatible stores use this pattern like
    // https://github.com/voxpelli/node-connect-pg-simple/blob/master/index.js
    function SubStore(options) {
      Store.call(this, options);
    }

    const store = new SubStore();
  });
});
