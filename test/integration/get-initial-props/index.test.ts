import request from 'supertest';
import { nextBuild, startApp, stopApp } from '../next-test-utils';
import { Server } from 'http';
import { AddressInfo } from 'net';

const appDir = __dirname;
let server: Server;
let agent: request.SuperTest<request.Test>;
let base: string;

// eslint-disable-next-line no-undef
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 30;

beforeAll(async () => {
  await nextBuild(appDir);
  server = await startApp({
    dir: appDir,
    dev: false,
    quiet: true,
  });
  const appPort = (server.address() as AddressInfo).port;
  base = `http://localhost:${appPort}`;
});

afterAll(() => stopApp(server));

describe('Using pages (getInitialProps)', () => {
  beforeEach(() => {
    agent = request.agent(base);
  });

  it('withSession should create, persist, and remove session', async () => {
    let res;
    res = await agent.get('/with-session');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>1</p>');
    res = await agent.get('/with-session');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>2</p>');
    await agent.delete('/with-session');
    res = await agent.get('/apply-session');
    expect(res.text).toContain('<p>1</p>');
    expect(res.header).toHaveProperty('set-cookie');
  });

  it('applySession should create, persist, and remove session', async () => {
    let res;
    res = await agent.get('/apply-session');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>1</p>');
    res = await agent.get('/apply-session');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>2</p>');
    await agent.delete('/apply-session');
    res = await agent.get('/apply-session');
    expect(res.text).toContain('<p>1</p>');
    expect(res.header).toHaveProperty('set-cookie');
  });
});
