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

afterAll(() => server && server.close());

describe('Using pages', () => {
  beforeEach(() => {
    agent = request.agent(server);
  });

  it('should create and persist session', async () => {
    let res;
    res = await agent.post('/');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>1</p>');
    res = await agent.get('/');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>1</p>');
    res = await agent.post('/');
    expect(res.text).toContain('<p>2</p>');
  });

  it('should destroy session and refresh sessionId', async () => {
    let res;
    await agent.post('/');
    res = await agent.get('/');
    expect(res.text).toContain('<p>1</p>');
    await agent.delete('/');
    res = await agent.get('/');
    expect(res.text).toContain('<p>0</p>');
    expect(res.header).toHaveProperty('set-cookie');
  });
});
