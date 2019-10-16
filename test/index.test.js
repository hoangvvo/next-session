const http = require('http');
const { promisify } = require('util');
const request = require('supertest');
const session = require('../src/index');
const MemoryStore = require('../src/session/memory');

const { useSession, withSession } = session;

describe('session (basic)', () => {
  test('should export Session, Store, Cookie, and MemoryStore', () => {
    expect(typeof session.Session).toStrictEqual('function');
    expect(typeof session.Store).toStrictEqual('function');
    expect(typeof session.Cookie).toStrictEqual('function');
    expect(typeof session.MemoryStore).toStrictEqual('function');
  });

  test('should default to MemoryStore', async () => {
    //  Model req, res
    const req = { cookies: {} };
    const res = { end: () => null };
    const handler = async (req, res) => {
      await useSession(req, res);
      return req.sessionStore;
    };
    expect(await handler(req, res)).toBeInstanceOf(MemoryStore);
  });

  test.each([10, 'string', true, {}])(
    'should throw if generateId is not a function',
    (generateId) => {
      expect(() => { withSession(null, { generateId }); }).toThrow();
    },
  );

  test('useSession to parse cookies', async () => {
    const req = {
      headers: {
        cookie: 'sessionId=YmFieXlvdWFyZWJlYXV0aWZ1bA',
      },
    };
    const res = {};
    await useSession(req, res);
    expect(req.cookies.sessionId).toStrictEqual('YmFieXlvdWFyZWJlYXV0aWZ1bA');
  });
});

describe('session (using withSession API Routes)', () => {
  const modifyReq = (handler, reqq) => (req, res) => {
    if (!req.headers.cookie) req.headers.cookie = '';
    Object.assign(req, reqq);
    //  special case for should do nothing if req.session is defined
    if (req.url === '/definedSessionTest') {
      req.session = {};
    }
    return handler(req, res);
  };

  const server = http.createServer(
    modifyReq(
      withSession((req, res) => {
        if (req.method === 'POST') {
          req.session.johncena = 'invisible';
          if (req.headers['res-end-twice']) {
            res.end();
          }
          return res.end();
        }
        if (req.method === 'GET') return res.end(req.session.johncena || '');
        if (req.method === 'DELETE') {
          req.session.destroy();
          return res.end();
        }
        return res.end();
      }, {
        cookie: {
          maxAge: 10000,
        },
      }),
    ),
  );
  beforeEach(() => promisify(server.listen.bind(server))());
  afterEach(() => promisify(server.close.bind(server))());

  test('should do nothing if req.session is defined', () => request(server).get('/definedSessionTest')
    .then(({ header }) => expect(header).not.toHaveProperty('set-cookie')));

  test('should create session properly and persist sessionId', () => {
    const agent = request.agent(server);
    return agent.post('/', { headers: { 'res-end-twice': 'true' } })
      .then(() => agent.get('/').expect('invisible'))
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
  });

  test('should destroy session properly and refresh sessionId', () => {
    const agent = request.agent(server);
    return agent.post('/')
      .then(() => agent.delete('/'))
      .then(() => agent.get('/').expect(''))
      .then(({ header }) => expect(header).toHaveProperty('set-cookie'));
    //  should set cookie since session was destroyed
  });

  test('should support calling res.end() multiple times', () => {
    const agent = request.agent(server);
    return agent.post('/').set('res-end-twice', 'true')
      .then(() => agent.get('/').expect('invisible'))
      .then(({ header }) => expect(header).not.toHaveProperty('set-cookie'));
    //  should not set cookie since session with data is established
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
