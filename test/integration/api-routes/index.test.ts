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

fs.rmSync(path.join(appDir, '.next'), { force: true, recursive: true });

jest.setTimeout(1000 * 30);

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

describe('Using API Routes', () => {
  beforeEach(() => {
    agent = request.agent(base);
  });

  it('withSession should create, persist, and remove session', async () => {
    let res;
    res = await agent.get('/api/with-session');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('1');
    res = await agent.get('/api/with-session');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toContain('2');
    await agent.delete('/api/with-session');
    res = await agent.get('/api/apply-session');
    expect(res.text).toContain('1');
    expect(res.header).toHaveProperty('set-cookie');
  });

  it('applySession should create, persist, and remove session', async () => {
    let res;
    res = await agent.get('/api/apply-session');
    expect(res.header).toHaveProperty('set-cookie');
    expect(res.text).toContain('1');
    res = await agent.get('/api/apply-session');
    expect(res.header).not.toHaveProperty('set-cookie');
    expect(res.text).toContain('2');
    await agent.delete('/api/apply-session');
    res = await agent.get('/api/apply-session');
    expect(res.text).toBe('1');
    expect(res.header).toHaveProperty('set-cookie');
  });
});
