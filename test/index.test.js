const request = require('supertest');
const setUpServer = require('./helper/setUpServer');
const session = require('../lib/index');
const MemoryStore = require('../lib/session/memory');

const { Store } = session;

//  Core

describe('session', () => {
  test('should export Session, Store, Cookie, and MemoryStore', () => {
    expect(typeof session.Session).toStrictEqual('function');
    expect(typeof session.Store).toStrictEqual('function');
    expect(typeof session.Cookie).toStrictEqual('function');
    expect(typeof session.MemoryStore).toStrictEqual('function');
  });

  test('can promisify callback store', async () => {
    class CbStore extends Store {
      constructor() {
        super();
        this.sessions = 1;
      }

      get(sid, cb) {
        if (cb) cb(null, this.sessions);
      }

      set(sid, sess, cb) {
        if (cb) cb(null, this.sessions);
      }

      destroy(sid, cb) {
        if (cb) cb(null, this.sessions);
      }

      touch(sid, sess, cb) {
        if (cb) cb(null, this.sessions);
      }
    }

    const req = { cookies: {} };
    const res = { end: () => null };
    await new Promise(resolve => {
      session({ store: new CbStore() })(req, res, resolve);
    });
    // facebook/jest#2549
    expect(req.sessionStore.get().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.set().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.destroy().constructor.name).toStrictEqual(
      'Promise'
    );
    expect(req.sessionStore.touch().constructor.name).toStrictEqual('Promise');
  });

  const defaultHandler = (req, res) => {
    if (req.method === 'POST') {
      req.session.johncena = 'invisible';
    }
    if (req.method === 'GET') {
      res.end((req.session && req.session.johncena) || '');
      return;
    }
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
    await agent
      .get('/')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    store.emit('connect');
    await agent
      .get('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
  });

  test('should do nothing if req.session is defined', async () => {
    // eslint-disable-next-line no-return-assign
    const server = setUpServer(defaultHandler, undefined, req => {
      req.session = {};
    });
    await request(server)
      .get('/')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should create session properly and persist sessionId', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent
      .get('/')
      .expect('invisible')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
  });

  test('should destroy session properly and refresh sessionId', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent
      .get('/')
      .expect('invisible')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent.delete('/');
    await agent
      .get('/')
      .expect('')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
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
    const server = setUpServer(
      (req, res) => {
        if (req.method === 'POST') req.session.test = 'test';
        res.end(`${req.session.cookie.expires.valueOf()}`);
      },
      { touchAfter: '5000', cookie: { maxAge: '1 day' } }
    );

    const agent = request.agent(server);
    await agent.post('/');
    let originalExpires;
    await agent.get('/').then(res => {
      originalExpires = res.text;
    });
    //  Some miliseconds passed... hopefully
    await agent.get('/').expect(originalExpires);
  });
});

//  Adapters
