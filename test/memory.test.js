import http from 'http';
import * as Promise from 'bluebird';
import request from 'supertest';
import merge from 'lodash.merge';
import cookie from 'cookie';
import url from 'url';
import session from '../lib/index';

const modifyReq = (handler, reqq) => (req, res) => {
  req.query = url.parse(req.url, true).query;
  if (req.headers.cookie) req.cookies = cookie.parse(req.headers.cookie);
  else req.cookies = {};
  merge(req, reqq);
  return handler(req, res);
};

describe('session', () => {
  const server = http.createServer(
    modifyReq(
      session((req, res) => {
        if (req.url === '/all') {
          req.sessionStore.all().then((sessions) => {
            const users = sessions.map(sess => JSON.parse(sess).user);
            res.end(users.toString());
          });
        } else {
          req.session.user = req.query.user;
          res.end();
        }
      }),
    ),
  );
  beforeEach(() => Promise.promisify(server.listen.bind(server))());
  afterEach(() => Promise.promisify(server.close.bind(server))());

  test('should register different user and show all sessions', () => request(server).get('/').query('user=squidward')
    .then(() => request(server).get('/').query('user=spongebob'))
    .then(() => request(server).get('/').query('user=patrick'))
    .then(() => request(server).get('/all').expect('squidward,spongebob,patrick')));
});
