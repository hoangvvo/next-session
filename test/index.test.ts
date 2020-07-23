import React from 'react';
import { createServer, RequestListener } from 'http';
import request from 'supertest';
import EventEmitter from 'events';
import { parse } from 'url';
import {
  applySession,
  promisifyStore,
  withSession,
  session,
  SessionData,
  expressSession,
} from '../src';
import { Options } from '../src/types';
import MemoryStore from '../src/store/memory';
import Session from '../src/session';
import Cookie from '../src/cookie';
import { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import { NextPage, NextApiHandler, NextComponentType } from 'next';
const signature = require('cookie-signature');
const { parse: parseCookie } = require('cookie');

const defaultHandler = (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST')
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === 'DELETE') req.session.destroy();
  res.end(`${(req.session && req.session.views) || 0}`);
};

function setUpServer(
  handler: RequestListener = defaultHandler,
  options?: boolean | Options,
  prehandler?: (req: IncomingMessage, res: ServerResponse) => any
) {
  const server = createServer(async (req, res) => {
    if (prehandler) await prehandler(req, res);
    if (options !== false) await applySession(req, res, options as Options);
    await handler(req, res);
  });
  return server;
}

describe('applySession', () => {
  test('should default to MemoryStore', async () => {
    const req: any = {};
    const res: any = { end: () => null };
    await applySession(req, res);
    expect(req.sessionStore).toBeInstanceOf(MemoryStore);
  });

  test('should do nothing if req.session is defined', async () => {
    const server = setUpServer(defaultHandler, undefined, (req, res) => {
      req.session = {} as any;
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
        res.end(`${req.session.cookie.expires?.valueOf()}`);
      },
      { rolling: true, touchAfter: 5000, cookie: { maxAge: 60 * 60 * 24 } }
    );
    const agent = request.agent(server);
    await agent.post('/');
    let originalExpires;
    await agent.get('/').then((res) => {
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
    await request(server).get('/').expect('Hello, world!');
  });

  test('should allow encode and decode sessionId', async () => {
    const secret = 'keyboard cat';
    const badSecret = 'nyan cat';
    const store = new MemoryStore();

    const decodeFn = (key: string) => (raw: string) =>
      signature.unsign(raw.slice(2), key);
    const encodeFn = (key: string) => (sessId: string) =>
      sessId && `s:${signature.sign(sessId, key)}`;
    const server = setUpServer(
      async (req, res) => {
        if (req.method === 'POST') req.session.hello = 'world';
        res.end(req.session.hello);
      },
      {
        store,
        decode: decodeFn(secret),
        encode: encodeFn(secret),
      }
    );
    const server2 = setUpServer(
      (req, res) => res.end(String(req.session.hello)),
      {
        store,
        decode: decodeFn(badSecret),
        encode: encodeFn(badSecret),
      }
    );
    let sessId = '';
    await request(server)
      .post('/')
      .expect('world')
      .expect(({ header }) => {
        sessId = parseCookie(header['set-cookie'][0]).sid;
      });
    // Return undefined due to mismatched secret
    await request(server2)
      .get('/')
      .set('Cookie', `sid=${sessId}`)
      .expect('undefined');
  });
  test('should define session.isNew that determines if session is new', async () => {
    const server = setUpServer((req, res) => {
      const isNew = req.session.isNew;
      req.session.foo = 'bar';
      res.end(String(isNew));
    });
    const agent = request.agent(server);
    await agent.get('/').expect('true');
    await agent.get('/').expect('false');
  })
});

describe('withSession', () => {
  // FIXME: Replace with integration test
  test('works with API Routes', async () => {
    const request: any = {};
    const response: any = { end: () => null };
    // eslint-disable-next-line no-unused-vars
    function handler(req: any, res: any) {
      return req.session;
    }
    expect(
      await (withSession(handler) as NextApiHandler)(request, response)
    ).toBeInstanceOf(Session);
  });

  test('works with pages#getInitialProps', async () => {
    const Page: NextPage = () => {
      return React.createElement('div');
    };
    Page.getInitialProps = (context) => {
      return (context.req as IncomingMessage).session;
    };
    const ctx = { req: { headers: { cookie: '' } }, res: {} };
    expect(
      await ((withSession(Page) as NextPage).getInitialProps as NonNullable<
        NextComponentType['getInitialProps']
      >)(ctx as any)
    ).toBeInstanceOf(Session);
  });

  test('return no-op if no ssr', async () => {
    function StaticPage() {
      return React.createElement('div');
    }
    expect(
      (withSession(StaticPage) as NextPage).getInitialProps
    ).toBeUndefined();
  });
});

describe('connect middleware', () => {
  // FIXME: Replace with integration test
  test('works as middleware', async () => {
    const request: any = {};
    const response: any = { end: () => null };
    await new Promise((resolve) => {
      session()(request, response, resolve);
    });
    expect(request.session).toBeInstanceOf(Session);
  });

  test('respects storeReady', async () => {
    const store = new MemoryStore();
    const server = setUpServer(defaultHandler, false, async (req, res) => {
      await new Promise((resolve) => {
        session({ store })(req, res, resolve);
      });
    });
    await request(server).get('/');
    store.emit('disconnect');
    await request(server)
      .get('/')
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    store.emit('connect');
    await request(server)
      .get('/')
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
  });
});

describe('Store', () => {
  test('should convert String() expires to Date() expires', () => {
    let sess = {
      cookie: new Cookie({ maxAge: 100000 }),
    };
    //  force sess.cookie.expires to be string
    sess = JSON.parse(JSON.stringify(sess));
    const cookie = new Cookie(sess.cookie);
    expect(cookie.expires).toBeInstanceOf(Date);
  });
  test('should extend EventEmitter', () => {
    // @ts-ignore
    expect(new expressSession.Store()).toBeInstanceOf(EventEmitter);
  });
  test('should allow store subclasses to use Store.call(this)', () => {
    // Some express-compatible stores use this pattern like
    // https://github.com/voxpelli/node-connect-pg-simple/blob/master/index.js
    function SubStore() {
      // @ts-ignore
      expressSession.Store.call(this);
    }
    // eslint-disable-next-line no-unused-vars
    // @ts-ignore
    const store = new SubStore();
  });
});

describe('promisifyStore', () => {
  test('can promisify callback store', async () => {
    class CbStore {
      sessions: any;
      constructor() {
        this.sessions = {};
      }

      /* eslint-disable no-unused-expressions */
      get(sid: string, cb: (err?: any, session?: SessionData | null) => void) {
        cb && cb(null, this.sessions);
      }

      set(
        sid: string,
        sess: SessionData,
        cb: (err: any, session?: SessionData | null) => void
      ) {
        cb && cb(null, this.sessions);
      }

      destroy(
        sid: string,
        cb: (err: any, session?: SessionData | null) => void
      ) {
        cb && cb(null, this.sessions);
      }

      touch(
        sid: string,
        sess: SessionData,
        cb: (err: any, session?: SessionData | null) => void
      ) {
        cb && cb(null, this.sessions);
      }
    }

    const req: any = {};
    const res: any = { end: () => null };
    // We have some discrepancies in session.cookie.sameSite, one specifies 'lax', 'strict' while other is string
    // @ts-ignore
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
            (sess: string) => JSON.parse(sess).user
          );
          res.end(ss.toString());
        } else {
          req.session.user = parse(req.url as string, true).query.user;
          res.end();
        }
      },
      { store }
    );
    await request(server).get('/').query('user=squidward');
    await request(server).get('/').query('user=spongebob');
    await request(server).get('/').query('user=patrick');
    await request(server).get('/all').expect('squidward,spongebob,patrick');
  });

  test('should expire session', async () => {
    const sessionStore = new MemoryStore();
    let sessionId: string | undefined | null;
    let sessionInstance: Session;
    const server = setUpServer(
      (req, res) => {
        if (req.method === 'POST') {
          req.session.views = req.session.views ? req.session.views + 1 : 1;
          sessionInstance = req.session;
          sessionId = req.sessionId;
        }
        res.end(`${(req.session && req.session.views) || 0}`);
      },
      { cookie: { maxAge: 5 }, store: sessionStore }
    );
    const agent = request.agent(server);
    await agent.post('/');
    await agent.get('/').expect('1');
    //  Mock waiting for 10 second later for cookie to expire
    const futureTime = new Date(Date.now() + 10000).valueOf();
    global.Date.now = jest.fn(() => futureTime);
    await agent.get('/').expect('0');
    //  Check in the store
    expect(await sessionStore.get(sessionId as string)).toBeNull();
    //  Touch will return undefind
    expect(
      // @ts-ignore
      await sessionStore.touch(sessionId as string, sessionInstance)
    ).toBeUndefined();
    // @ts-ignore
    global.Date.now.mockReset();
  });
});
