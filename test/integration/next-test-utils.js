// Adapted from https://github.com/lfades/next-with-apollo/blob/master/integration/next-test-utils.ts
// Switch out node-fetch since it cannot save cookie

import path from 'path';
import http from 'http';
import spawn from 'cross-spawn';
import nextServer from 'next';

function promiseCall(obj, method, ...args) {
  return new Promise((resolve, reject) => {
    const newArgs = [
      ...args,
      function(err, res) {
        if (err) return reject(err);
        resolve(res);
      }
    ];

    obj[method](...newArgs);
  });
}

export { nextServer };

export async function startApp(options) {
  const app = nextServer(options);

  await app.prepare();

  const handler = app.getRequestHandler();
  const server = http.createServer(handler);

  server.__app = app;

  await promiseCall(server, 'listen');

  return server;
}

export async function stopApp(server) {
  const app = (server)._app;

  if (app) await app.close();
  await promiseCall(server, 'close');
}

export function runNextCommand(
  args,
  options = {}
) {
  const nextDir = path.dirname(require.resolve('next/package'));
  const nextBin = path.join(nextDir, 'dist/bin/next');
  const cwd = nextDir;
  const env = { ...process.env, ...options.env, NODE_ENV: '' };

  return new Promise((resolve, reject) => {
    console.log(`Running command "next ${args.join(' ')}"`);
    const instance = spawn('node', [nextBin, ...args], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderrOutput = '';
    if (options.stderr) {
      instance.stderr.on('data', function(chunk) {
        stderrOutput += chunk;
      });
    }

    let stdoutOutput = '';
    if (options.stdout) {
      instance.stdout.on('data', function(chunk) {
        stdoutOutput += chunk;
      });
    }

    instance.on('close', () => {
      resolve({
        stdout: stdoutOutput,
        stderr: stderrOutput
      });
    });

    instance.on('error', (err) => {
      err.stdout = stdoutOutput;
      err.stderr = stderrOutput;
      reject(err);
    });
  });
}

export function nextBuild(
  dir,
  args = [],
  opts
) {
  return runNextCommand(['build', dir, ...args], opts);
}

export function extractNextData(html) {
  const R = /<script id="__NEXT_DATA__" type="application\/json">([^<]*)<\/script>/gm;
  const [, json] = R.exec(html);
  const { props } = JSON.parse(json);

  return props;
}
