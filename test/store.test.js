import EventEmitter from 'events';
import crypto from 'crypto';
import Store from '../lib/session/store';

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
});
