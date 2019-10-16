const { createServer, IncomingMessage, ServerResponse } = require('http');
const { promisify } = require('util');
const request = require('supertest');
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

  test.each([10, 'string', true, {}])(
    'should throw if generateId is not a function (%p)',
    (generateId) => {
      expect(() => { session({ generateId }); }).toThrow();
    },
  );

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

  function setUpServer(handler, customOpts = {}) {
    let customIncomingMessage;
    let customServerResponse;

    if (typeof customOpts.request === 'object') {
      customIncomingMessage = { ...IncomingMessage };
      Object.assign(customIncomingMessage, customOpts.request);
    }
    if (typeof customOpts.response === 'object') {
      customServerResponse = { ...ServerResponse };
      Object.assign(customServerResponse, customOpts.response);
    }

    server = createServer({
      IncomingMessage: IncomingMessage || customIncomingMessage,
      ServerResponse: ServerResponse || customServerResponse,
    }, withSession(handler, {
      ...customOpts.nextSession,
    }));

    return promisify(server.listen.bind(server))();
  }

  test('should do nothing if req.session is defined', async () => {
    await setUpServer((req, res) => { res.end(); }, { request: { session: {} } });
    await request(server).get('/').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
  });

  test('should create session properly and persist sessionId', async () => {
    await setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
  });

  test('should destroy session properly and refresh sessionId', async () => {
    await setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent.post('/').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    await agent.get('/').expect('invisible').then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    await agent.delete('/');
    await agent.get('/').expect('').then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    //  should set cookie since session was destroyed
  });

  test('should handle multiple res.end correctly', async () => {
    //  https://github.com/hoangvvo/next-session/pull/31
    await setUpServer((req, res) => {
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
