import request, { SuperTest, Test } from 'supertest';
import {
  nextBuild,
  startApp
} from '../next-test-utils';
import { Server } from 'http';

const appDir = __dirname;
let server: Server;
let agent: SuperTest<Test>;

// eslint-disable-next-line no-undef
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 30;

beforeAll(async () => {
  await nextBuild(appDir);
  server = await startApp({
    dir: appDir,
    dev: false,
    quiet: true
  });
});

afterAll(() => server.close());

describe('Using pages (getServerSideProps)', () => {
  beforeEach(() => {
    agent = request.agent(server);
  });

  it('applySession should create, persist, and remove session', async () => {
    let res;
    res = await agent.get('/apply-session');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('<p>1</p>');
    res = await agent.get('/apply-session');
    expect(res.header).not.toHaveProperty('set-cookie')
    expect(res.text).toContain('<p>2</p>');
    await agent.delete('/apply-session');
    res = await agent.get('/apply-session');
    expect(res.text).toContain('<p>1</p>');
    expect(res.header).toHaveProperty('set-cookie');
  });
});
