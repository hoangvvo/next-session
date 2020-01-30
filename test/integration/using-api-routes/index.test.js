import request from 'supertest';
import { nextBuild, startApp } from '../next-test-utils';

const appDir = __dirname;
let server;
let app;
let agent;

// eslint-disable-next-line no-undef
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 30;

beforeAll(async () => {
  await nextBuild(appDir);
  app = {
    dir: appDir,
    dev: false,
    quiet: true
  };
  server = await startApp(app);
});

afterAll(() => server.close());

describe('Using API Routes', () => {
  beforeEach(() => {
    agent = request.agent(server);
  });

  it('should create and persist session', async () => {
    let res;
    res = await agent.post('/api');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toEqual('1');
    res = await agent.get('/api');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toEqual('1');
    await agent.post('/api').expect('2');
  });

  it('should destroy session and refresh sessionId', async () => {
    let res;
    await agent.post('/api');
    res = await agent.get('/api');
    expect(res.text).toEqual('1');
    await agent.delete('/api');
    res = await agent.get('/api');
    expect(res.text).toEqual('0');
    expect(res.header).toHaveProperty('set-cookie');
  });
});
