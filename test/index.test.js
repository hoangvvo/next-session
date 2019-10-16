const { promisify } = require('util');
const request = require('supertest');
const setUpServer = require('./helper/setUpServer');
const session = require('../src/index');
const MemoryStore = require('../src/session/memory');

const { useSession, withSession } = session;

//  Core

describe('session', () => {
  test('should export Session, Store, Cookie, and MemoryStore', () => {
    expect(typeof session.Session).toStrictEqual('function');
    expect(typeof session.Store).toStrictEqual('function');
    expect(typeof session.Cookie).toStrictEqual('function');
    expect(typeof session.MemoryStore).toStrictEqual('function');
  });

  test('should default to MemoryStore with warning', async () => {
    const req = {}; const res = { end: () => null };
    const consoleWarnSpy = jest.spyOn(global.console, 'warn');

    await new Promise((resolve) => {
      session()(req, res, resolve);
    });
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(req.sessionStore).toBeInstanceOf(MemoryStore);
  });

  test('should throw if generateId is not a function', () => {
    [10, 'string', true, {}].forEach((generateId) => {
      expect(() => { session({ generateId }); }).toThrow();
    });
  });

  let server;
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
  afterEach(() => server && server.close && promisify(server.close.bind(server))());

  test('should do nothing if req.session is defined', async () => {
    server = await setUpServer(defaultHandler, { beforeHandle: (req) => req.session = {} });
    await request(server).get('/').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should create session properly and persist sessionId', async () => {
    server = await setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
  });

  test('should destroy session properly and refresh sessionId', async () => {
    server = await setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent.delete('/');
    await agent.get('/').expect('').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    //  should set cookie since session was destroyed
  });

  test('should handle multiple res.end correctly', async () => {
    //  https://github.com/hoangvvo/next-session/pull/31
    server = await setUpServer((req, res) => {
      res.end('Hello, world!');
      res.end();
    });
    const agent = request.agent(server);
    await agent.get('/').expect('Hello, world!');
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
});
