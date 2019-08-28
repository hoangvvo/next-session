const http = require('http');
const Promise = require('bluebird');
const request = require('supertest');
const cookie = require('cookie');
const session = require('../src/index');
const { useSession } = require('../src/index');
const MemoryStore = require('../src/session/memory');

const modifyReq = (handler, reqq) => (req, res) => {
  if (req.headers.cookie) req.cookies = cookie.parse(req.headers.cookie);
  else req.cookies = {};
  Object.assign(req, reqq);
  //  special case for should do nothing if req.session is defined
  if (req.url === '/definedSessionTest') {
    req.session = {};
  }
  return handler(req, res);
};

describe('session', () => {
  const server = http.createServer(
    modifyReq(
      session((req, res) => {
        if (req.method === 'POST') {
          req.session.johncena = 'invisible';
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
  beforeEach(() => Promise.promisify(server.listen.bind(server))());
  afterEach(() => Promise.promisify(server.close.bind(server))());

  test('should export Session, Store, Cookie, and MemoryStore', () => {
    expect(typeof session.Session).toStrictEqual('function');
    expect(typeof session.Store).toStrictEqual('function');
    expect(typeof session.Cookie).toStrictEqual('function');
    expect(typeof session.MemoryStore).toStrictEqual('function');
  });

  test('should default to MemoryStore', () => {
    //  Model req, res
    const req = { cookies: {} };
    const res = { end: () => null };
    const handler = (req) => req.sessionStore;
    return session(handler)(req, res).then((result) => {
      expect(result).toBeInstanceOf(MemoryStore);
    });
  });

  test.each([10, 'string', true, {}])(
    'should throw if generateId is not a function',
    (generateId) => {
      expect(() => { session(null, { generateId }); }).toThrow();
    },
  );
  test('should do nothing if req.session is defined', () => request(server).get('/definedSessionTest')
    .then(({ header }) => expect(header).not.toHaveProperty('set-cookie')));

  test('should create session properly and persist sessionId', () => {
    const agent = request.agent(server);
    return agent.post('/')
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
});

describe('useSession (getInitialProps)', () => {
  test('useSession to register req.session', async () => {
    const req = {
      headers: {
        cookie: '',
      },
    };
    const res = {};
    await useSession(req, res);
    expect(req.session).toBeInstanceOf(session.Session);
  });
  test('useSession should return if no req', async () => {
    expect(useSession()).toStrictEqual(undefined);
  });
  test('useSession should throw TypeError if no res argument', async () => {
    expect(() => { useSession(() => {}); }).toThrow();
  });
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
