import React from 'react';
import { createServer } from 'http';
import request from 'supertest';
import EventEmitter from 'events';
import { parse } from 'url';
import {
  applySession,
  Store,
  MemoryStore,
  promisifyStore,
  withSession,
  session,
} from '../src';
import Cookie from '../src/cookie'
import Session from '../src/session';
import { loadGetInitialProps } from 'next/dist/next-server/lib/utils'

const defaultHandler = (req, res) => {
  if (req.method === 'POST')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') req.session.destroy();
  res.end(`${(req.session && req.session.views) || 0}`);
};

function setUpServer(handler = defaultHandler, options, prehandler) {
  const server = createServer(async (req, res) => {
    if (prehandler) await prehandler(req, res);
    if (options !== false) await applySession(req, res, options);
    await handler(req, res);
  });
  return server;
}

describe('applySession', () => {
  test('should default to MemoryStore', async () => {
    const req = {};
    const res = { end: () => null };
    await applySession(req, res);
    expect(req.sessionStore).toBeInstanceOf(MemoryStore);
  });

  test('should do nothing if req.session is defined', async () => {
    const server = setUpServer(defaultHandler, undefined, req => {
      req.session = {};
    });
    await request(server)
      .get('/')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should create and persist session', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent
      .get('/')
      .expect('1')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should destroy session and refresh sessionId', async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent
      .get('/')
      .expect('1')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent.delete('/');
    await agent
      .get('/')
      .expect('0')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    //  should set cookie since session was destroyed
  });

  test('should allow manually committing session', async () => {
    const server = setUpServer(
      async (req, res) => {
        req.session.hello = 'world';
        if (req.method === 'POST') await req.session.commit();
        res.end((req.session && req.session.hello) || '');
      },
      { autoCommit: false }
    );
    const agent = request.agent(server);
    await agent
      .get('/')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent
      .post('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
  });

  test('should respect touchAfter', async () => {
    const server = setUpServer(
      (req, res) => {
        req.session.hello = 'world';
        res.end(`${req.session.cookie.expires.valueOf()}`);
      },
      { rolling: true, touchAfter: 5000, cookie: { maxAge: 60 * 60 * 24 } }
    );
    const agent = request.agent(server);
    await agent.post('/');
    let originalExpires;
    await agent.get('/').then(res => {
      originalExpires = res.text;
    });
    const res = await agent.get('/');
    expect(res.text).toStrictEqual(originalExpires);
    // should not set-cookie despite rolling=true
    expect(res.header).not.toHaveProperty('set-cookie');
  });

  test('should handle multiple res.end correctly', async () => {
    //  https://github.com/hoangvvo/next-session/pull/31
    const server = setUpServer((req, res) => {
      res.end('Hello, world!');
      res.end();
    });
    await request(server)
      .get('/')
      .expect('Hello, world!');
  });
});

describe('withSession', () => {
  // FIXME: Replace with integration test
  test('works with API Routes', async () => {
    const request = {};
    const response = { end: () => null };
    // eslint-disable-next-line no-unused-vars
    function handler(req, res) {
      return req.session;
    }
    expect(await withSession(handler)(request, response)).toBeInstanceOf(
      Session
    );
  });

  test('works with _app#getInitialProps', async () => {
    function App() {
      return React.createElement();
    }
    App.getInitialProps = context => {
      const req = context.req || (context.ctx && context.ctx.req);
      return { session: req.session };
    };
    const ctx = {
      Component: {},
      ctx: { req: { headers: { cookie: '' } }, res: {} }
    };
    expect(
      (await loadGetInitialProps(withSession(App),ctx)).session
    ).toBeInstanceOf(Session);
  });

  test('works with pages#getInitialProps', async () => {
    // TODO: Make use of loadGetInitialProps
    function Page() {
      return React.createElement();
    }
    Page.getInitialProps = context => {
      const req = context.req || (context.ctx && context.ctx.req);
      return req.session;
    };
    const ctx = { req: { headers: { cookie: '' } }, res: {} };
    expect(
      await withSession(Page).getInitialProps(ctx)
    ).toBeInstanceOf(Session);
  });

  test('return no-op if no ssr', async () => {
    function App() {
      return React.createElement();
    }
    expect(withSession(App).getInitialProps).toBeUndefined();
  });
});

describe('connect middleware', () => {
  // FIXME: Replace with integration test
  test('works as middleware', async () => {
    const request = {};
    const response = { end: () => null };
    await new Promise(resolve => {
      session()(request, response, resolve);
    });
    expect(request.session).toBeInstanceOf(Session);
  });

  test('respects storeReady', async () => {
    const store = new MemoryStore();
    const server = setUpServer(defaultHandler, false, async (req, res) => {
      await new Promise(resolve => {
        session({ store })(req, res, resolve);
      });
    });
    await request(server).get('/');
    store.emit('disconnect');
    await request(server).get('/').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    store.emit('connect');
    await request(server).get('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
  })
});

describe('Store', () => {
  test('should extend EventEmitter', () => {
    expect(new Store()).toBeInstanceOf(EventEmitter);
  });
  test('should convert String() expires to Date() expires', () => {
    let sess = {
      cookie: new Cookie({ maxAge: 100000 })
    }
    //  force sess.cookie.expires to be string
    sess = JSON.parse(JSON.stringify(sess));
    const cookie = new Cookie(sess.cookie);
    expect(cookie.expires).toBeInstanceOf(Date);
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

describe('promisifyStore', () => {
  test('can promisify callback store', async () => {
    class CbStore extends Store {
      constructor() {
        super();
        this.sessions = 1;
      }

      /* eslint-disable no-unused-expressions */
      get(sid, cb) {
        cb && cb(null, this.sessions);
      }

      set(sid, sess, cb) {
        cb && cb(null, this.sessions);
      }

      destroy(sid, cb) {
        cb && cb(null, this.sessions);
      }

      touch(sid, cb) {
        cb && cb(null, this.sessions);
      }
    }

    const req = {};
    const res = { end: () => null };
    applySession(req, res, { store: promisifyStore(new CbStore()) });
    // facebook/jest#2549
    expect(req.sessionStore.get().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.set().constructor.name).toStrictEqual('Promise');
    expect(req.sessionStore.destroy().constructor.name).toStrictEqual(
      'Promise'
    );
    expect(req.sessionStore.touch().constructor.name).toStrictEqual('Promise');
  });
});

describe('MemoryStore', () => {
  test('should show every session', async () => {
    const store = new MemoryStore();
    store.sessions = {};
    const server = setUpServer(
      async (req, res) => {
        if (req.url === '/all') {
          const ss = (await req.sessionStore.all()).map(
            sess => JSON.parse(sess).user
          );
          res.end(ss.toString());
        } else {
          req.session.user = req.query.user;
          res.end();
        }
      },
      { store },
      req => (req.query = parse(req.url, true).query)
    );
    await request(server)
      .get('/')
      .query('user=squidward');
    await request(server)
      .get('/')
      .query('user=spongebob');
    await request(server)
      .get('/')
      .query('user=patrick');
    await request(server)
      .get('/all')
      .expect('squidward,spongebob,patrick');
  });

  test('should expire session', async () => {
    let sessionStore;
    let sessionId;
    let sessionInstance;
    const server = setUpServer(
      (req, res) => {
        if (req.method === 'POST') {
          req.session.views = req.session.views ? req.session.views + 1 : 1;
          sessionInstance = req.session;
          sessionStore = req.sessionStore;
          sessionId = req.sessionId;
        }
        res.end(`${(req.session && req.session.views) || 0}`);
      },
      { cookie: { maxAge: 5 } }
    );
    const agent = request.agent(server);
    await agent.post('/');
    await agent.get('/').expect('1');
    //  Mock waiting for 10 second later for cookie to expire
    const futureTime = new Date(Date.now() + 10000).valueOf();
    global.Date.now = jest.fn(() => futureTime);
    await agent.get('/').expect('0');
    //  Check in the store
    expect(await sessionStore.get(sessionId)).toBeNull();
    //  Touch will return undefind
    expect(
      await sessionStore.touch(sessionId, sessionInstance)
    ).toBeUndefined();
    global.Date.now.mockReset();
  });
});
