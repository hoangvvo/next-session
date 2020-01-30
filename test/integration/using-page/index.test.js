import request from 'supertest';
import { nextBuild, startApp, extractNextData } from '../next-test-utils';

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

  it('should respect touchAfter', async () => {
    await agent.get('/touch-after');
    const nextData = extractNextData((await agent.get('/touch-after')).text);
    const originalExpires = nextData.pageProps.expires;
    const res = await agent.get('/touch-after');
    expect(res.header).not.toHaveProperty('set-cookie'); // should not set-cookie despite rolling=true
    expect(res.text).toContain(`<p>${originalExpires}</p>`);
  });

  it('should expire session', async () => {
    expect((await agent.get('/expire')).text).toContain('<p>1</p>');
    expect((await agent.get('/expire')).text).toContain('<p>2</p>');
    await new Promise(resolve => {
      setTimeout(() => resolve(), 1000);
    });
    expect((await agent.get('/expire')).text).toContain('<p>1</p>');
  });

  it('should allow manually session commit', async () => {
    expect((await agent.get('/manual-commit')).header).not.toHaveProperty(
      'set-cookie'
    );
    expect((await agent.post('/manual-commit')).header).toHaveProperty(
      'set-cookie'
    );
  });
});
