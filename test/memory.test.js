const { promisify } = require('util');
const { parse } = require('url');
const request = require('supertest');
const setUpServer = require('./helper/setUpServer');

describe('session', () => {
  let server;
  afterEach(() => promisify(server.close.bind(server))());

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

    await request(server).get('/').query('user=squidward')
      .then(() => request(server).get('/').query('user=spongebob'))
      .then(() => request(server).get('/').query('user=patrick'))
      .then(() => request(server).get('/all').expect('squidward,spongebob,patrick'));
  });
});
