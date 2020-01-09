const request = require('supertest');
const crypto = require('crypto');
const setUpServer = require('./helper/setUpServer');
const session = require('../src/index');
const { initSession } = require('../src/index');
const MemoryStore = require('../src/session/memory');
const Cookie = require('../src/session/cookie');

const { useSession, withSession, Store } = session;

//  Core

describe('session', () => {
  test('should export Session, Store, Cookie, and MemoryStore', () => {
    expect(typeof session.Session).toStrictEqual('function');
    expect(typeof session.Store).toStrictEqual('function');
    expect(typeof session.Cookie).toStrictEqual('function');
    expect(typeof session.MemoryStore).toStrictEqual('function');
  });

  test('should default to MemoryStore', async () => {
    const req = {}; const res = { end: () => null };
    await new Promise((resolve) => {
      session()(req, res, resolve);
    });
    expect(req.sessionStore).toBeInstanceOf(MemoryStore);
    const req2 = { cookies: {} };
    await initSession(req2);
    expect(req2.sessionStore).toBeInstanceOf(MemoryStore);
  });

  test('can promisify callback store', async () => {
    class CbStore extends Store {
      constructor() {
        super();
        this.sessions = 1;
      }

      /* eslint-disable no-unused-expressions */
      get(sid, cb) { cb && cb(null, this.sessions); }

      set(sid, sess, cb) { cb && cb(null, this.sessions); }

      destroy(sid, cb) { cb && cb(null, this.sessions); }

      touch(sid, cb) { cb && cb(null, this.sessions); }
    }

    const req = {}; const res = { end: () => null };
    await new Promise((resolve) => {
      session({ store: new CbStore(), storePromisify: true })(req, res, resolve);
    });
    // facebook/jest#2549
    expect(req.sessionStore.get().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.set().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.destroy().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.touch().constructor.name).toStrictEqual('Promise');
  });

  const defaultHandler = (req, res) => {
    if (req.method === 'POST') {
      req.session.johncena = 'invisible';
    }
    if (req.method === 'GET') { res.end((req.session && req.session.johncena) || ''); return; }
    if (req.method === 'DELETE') {
      req.session.destroy();
    }
    res.end();
  };

  test('should work accordingly to store readiness', async () => {
    const store = new MemoryStore();
    const server = setUpServer(defaultHandler, { store });
    const agent = request.agent(server);
    await agent.get('/');
    store.emit('disconnect');
    await agent.get('/').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    store.emit('connect');
    await agent.get('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
  });

  test('should do nothing if req.session is defined', async () => {
    const server = setUpServer(defaultHandler, undefined, (req) => req.session = {});
    await request(server).get('/').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should create session properly and persist sessionId', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
  });

  test('should destroy session properly and refresh sessionId', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent.delete('/');
    await agent.get('/').expect('').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    //  should set cookie since session was destroyed
  });

  test('should handle multiple res.end correctly', async () => {
    //  https://github.com/hoangvvo/next-session/pull/31
    const server = setUpServer((req, res) => {
      res.end('Hello, world!');
      res.end();
    });
    const agent = request.agent(server);
    await agent.get('/').expect('Hello, world!');
  });

  test('should not touch according to touchAfter', async () => {
    const server = setUpServer((req, res) => {
      if (req.method === 'POST') req.session.test = 'test';
      res.end(`${req.session.cookie.expires.valueOf()}`);
    }, { touchAfter: '5000', cookie: { maxAge: '1 day' } });

    const agent = request.agent(server);
    await agent.post('/');
    let originalExpires;
    await agent.get('/').then((res) => { originalExpires = res.text; });
    //  Some miliseconds passed... hopefully
    await agent.get('/').expect(originalExpires);
  });
});

//  Adapters

describe('withSession', () => {
  test('should do nothing if no request or response object given', async () => {
    const req = undefined;
    const res = undefined;
    const handler = (req) => req && req.session;
    expect(await withSession(handler)(req, res)).toStrictEqual(undefined);
  });

  function component(ctx) {
    return component.getInitialProps(ctx);
  }
  component.getInitialProps = (context) => {
    const req = context.req || (context.ctx && context.ctx.req);
    return req.session;
  };

  test('works with _app', async () => {
    const contextObject = { ctx: { req: { headers: { cookie: '' } }, res: {} } };
    expect(await withSession(component)(contextObject)).toBeInstanceOf(session.Session);
  });

  test('works with _document and pages', async () => {
    const contextObject = { req: { headers: { cookie: '' } }, res: {} };
    expect(await withSession(component)(contextObject)).toBeInstanceOf(session.Session);
  });
});

describe('useSession', () => {
  test('should do nothing if no request or response object given', async () => {
    const req = undefined;
    const res = undefined;
    expect(await useSession(req, res).then(() => req && req.session)).toStrictEqual(undefined);
  });

  test('should work', async () => {
    const req = { headers: { cookie: '' } };
    const res = {};
    await useSession(req, res);
    expect(req.session).toBeInstanceOf(session.Session);
  });

  test('should return session values', async () => {
    const store = new MemoryStore();
    const sess = { hello: 'world', foo: 'bar', cookie: new Cookie({}) };
    store.sessions = { YmVsaWV2ZWlueW91cnNlbGY: JSON.stringify(sess) };
    const req = { headers: { cookie: 'sessionId=YmVsaWV2ZWlueW91cnNlbGY' } };
    const res = {};
    const sessions = await useSession(req, res, { store });
    //  useSession returns does not contain Cookie
    delete sess.cookie;
    const hash = (str) => crypto.createHash('sha1').update(JSON.stringify(str), 'utf8').digest('hex');
    expect(hash(sessions)).toStrictEqual(hash(sess));
  });
});
