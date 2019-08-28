const http = require('http');
const { promisify } = require('util');
const request = require('supertest');
const cookie = require('cookie');
const url = require('url');
const { withSession } = require('../src/index');

const modifyReq = (handler, reqq) => (req, res) => {
  req.query = url.parse(req.url, true).query;
  if (req.headers.cookie) req.cookies = cookie.parse(req.headers.cookie);
  else req.cookies = {};
  Object.assign(req, reqq);
  return handler(req, res);
};

describe('session', () => {
  const server = http.createServer(
    modifyReq(
      withSession((req, res) => {
        if (req.url === '/all') {
          req.sessionStore.all().then((sessions) => {
            const users = sessions.map((sess) => JSON.parse(sess).user);
            res.end(users.toString());
          });
        } else {
          req.session.user = req.query.user;
          res.end();
        }
      }),
    ),
  );
  beforeEach(() => promisify(server.listen.bind(server))());
  afterEach(() => promisify(server.close.bind(server))());

  test('should register different user and show all sessions', () => request(server).get('/').query('user=squidward')
    .then(() => request(server).get('/').query('user=spongebob'))
    .then(() => request(server).get('/').query('user=patrick'))
    .then(() => request(server).get('/all').expect('squidward,spongebob,patrick')));
});
