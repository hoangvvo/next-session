const { promisify } = require('util');
const { parse } = require('url');
const request = require('supertest');
const setUpServer = require('./helper/setUpServer');

describe('MemoryStore', () => {
  let server;
  afterEach(() => server && server.close && promisify(server.close.bind(server))());

  test('should register different user and show all sessions', async () => {
    server = await setUpServer((req, res) => {
      if (req.url === '/all') {
        req.sessionStore.all().then((sessions) => {
          const users = sessions.map((sess) => JSON.parse(sess).user);
          res.end(users.toString());
        });
      } else {
        req.session.user = req.query.user;
        res.end();
      }
    }, {
      beforeHandle: (req) => req.query = parse(req.url, true).query,
    });
    const agent = request.agent(server);
    await agent.get('/').query('user=squidward')
      .then(() => request(server).get('/').query('user=spongebob'))
      .then(() => request(server).get('/').query('user=patrick'))
      .then(() => request(server).get('/all').expect('squidward,spongebob,patrick'));
  });

  test('should not return session if it expired', async () => {
    let sessionStore;
    let sessionId;
    server = await setUpServer((req, res) => {
      if (req.method === 'POST') {
        req.session.hello = 'world'; res.end();
        sessionStore = req.sessionStore;
        sessionId = req.sessionId;
      }
      if (req.method === 'GET') {
        res.end((req.session && req.session.hello) || '');
      }
    }, { nextSession: { cookie: { maxAge: 5000 } } });
    const agent = request.agent(server);
    await agent.post('/').then(() => agent.get('/').expect('world'));

    //  Mock waiting for 10 second later for cookie to expire
    const futureTime = new Date(Date.now() + 10000).valueOf();
    global.Date.now = jest.fn(() => futureTime);

    await agent.get('/').expect('');

    //  Check in the store
    expect(await sessionStore.get(sessionId)).toBeNull();

    global.Date.now.mockReset();
  });
});
