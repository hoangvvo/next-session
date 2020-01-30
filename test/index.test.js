import crypto from 'crypto';
import EventEmitter from 'events';
import { Store } from '../lib';

describe('Store', () => {
  test('should extend EventEmitter', () => {
    expect(new Store()).toBeInstanceOf(EventEmitter);
  });
  test('should convert String() expires to Date() expires', () => {
    const store = new Store();
    const req = {};
    const res = {};
    let sess = store.generate(req, res, crypto.randomBytes(16).toString('hex'), { maxAge: 100000 });
    //  force sess.cookie.expires to be string
    sess = JSON.parse(JSON.stringify(sess));
    store.createSession(req, res, sess);
    expect(req.session.cookie.expires).toBeInstanceOf(Date);
  });
  test('should allow store subclasses to use Store.call(this)', () => {
    // Some express-compatible stores use this pattern like
    // https://github.com/voxpelli/node-connect-pg-simple/blob/master/index.js
    function SubStore(options) {
      options = options || {};
      Store.call(this, options);
    }
    // eslint-disable-next-line no-unused-vars
    const store = new SubStore();
  });
});

describe('MemoryStore', () => {

})
