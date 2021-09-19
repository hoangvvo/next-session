import { jest } from '@jest/globals';
import fs from 'fs';
import { Server } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { nextBuild, nextServer, startApp, stopApp } from '../next-test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = __dirname;
let server: Server;
let agent: request.SuperTest<request.Test>;
let base: string;

jest.setTimeout(1000 * 30);

fs.rmSync(path.join(appDir, '.next'), { force: true, recursive: true });

beforeAll(async () => {
  await nextBuild(appDir);
  const app = nextServer({
    dir: appDir,
    dev: false,
  });
  server = await startApp(app);
  const appPort = (server.address() as AddressInfo).port;
  base = `http://localhost:${appPort}`;
});

afterAll(() => stopApp(server));

describe('Using pages (getServerSideProps)', () => {
  beforeEach(() => {
    agent = request.agent(base);
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
