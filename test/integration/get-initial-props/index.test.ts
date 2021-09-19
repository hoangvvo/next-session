import { Server } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { nextBuild, nextServer, startApp, stopApp } from '../next-test-utils';

const appDir = __dirname;
let server: Server;
let agent: request.SuperTest<request.Test>;
let base: string;

jest.setTimeout(1000 * 30);

beforeAll(async () => {
  await nextBuild(appDir);
  const app = nextServer({
    dir: appDir,
    dev: false,
  })
  server = await startApp(app);
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
