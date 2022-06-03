# next-session

[![npm](https://badgen.net/npm/v/next-session)](https://www.npmjs.com/package/next-session)
[![minified size](https://badgen.net/bundlephobia/min/next-session)](https://bundlephobia.com/result?p=next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Lightweight _promise-based_ session middleware for [Next.js](https://github.com/zeit/next.js). Also works in [micro](https://github.com/zeit/micro) or [Node.js HTTP Server](https://nodejs.org/api/http.html), [Express](https://github.com/expressjs/express), and more.

> Also check out alternatives like [next-iron-session](https://github.com/vvo/next-iron-session). Take a look at [nextjs-mongodb-app](https://github.com/hoangvvo/nextjs-mongodb-app) to see this module in use.

## Installation

```sh
// NPM
npm install next-session
// Yarn
yarn add next-session
```

## Usage

:point_right: **Upgrading from v1.x to v2.x?** Please read the release notes [here](https://github.com/hoangvvo/next-session/releases/tag/v2.0.0)!

:point_right: **Upgrading from v2.x to v3.x?** Please read the release notes [here](https://github.com/hoangvvo/next-session/releases/tag/v3.0.0)!

:point_right: **Upgrading from v3.x to v4.x?** Please read the release notes [here](https://github.com/hoangvvo/next-session/releases/tag/v4.0.0)!

**Warning** The default session store (if `options?.store` is `undefined`), `MemoryStore`, **DOES NOT** work in production or serverless environment. You must use a [Session Store](#session-store).

```js
// ./lib/get-session.js
import nextSession from "next-session";
export const getSession = nextSession(options);
```

### API Routes

```js
import { getSession } from "./lib/get-session.js";

export default function handler(req, res) {
  const session = await getSession(req, res);
  session.views = session.views ? session.views + 1 : 1;
  // Also available under req.session:
  // req.session.views = req.session.views ? req.session.views + 1 : 1;
  res.send(
    `In this session, you have visited this website ${session.views} time(s).`
  );
}
```

Usage in API Routes may result in `API resolved without sending a response`. This can be solved by either adding:

```js
import nextSession from "next-session";
const getSession = nextSession();

export default function handler(req, res) {
  const session = await getSession(req, res);
  /* ... */
}

export const config = {
  api: {
    externalResolver: true,
  },
};
```

...or setting `options.autoCommit` to `false` and do `await session.commit()`.

```js
import nextSession from "next-session";
const getSession = nextSession({ autoCommit: false });

export default function handler(req, res) {
  const session = await getSession(req, res);
  /* ... */
  await session.commit();
}
```

### getServerSideProps

```js
import { getSession } from "./lib/get-session.js";

export default function Page({ views }) {
  return (
    <div>In this session, you have visited this website {views} time(s).</div>
  );
}

export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res);
  session.views = session.views ? session.views + 1 : 1;
  // Also available under req.session:
  // req.session.views = req.session.views ? req.session.views + 1 : 1;
  return {
    props: {
      views: session.views,
    },
  };
}
```

### Others

[express](https://github.com/expressjs/express), [next-connect](https://github.com/hoangvvo/next-connect)

```js
const express = require("express");
const app = express();
app.use(async (req, res, next) => {
  await getSession(req, res); // session is set to req.session
  next();
});
app.get("/", (req, res) => {
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  res.send(
    `In this session, you have visited this website ${req.session.views} time(s).`
  );
});
```

[micro](https://github.com/vercel/micro), [Vercel Serverless Functions](https://vercel.com/docs/functions/introduction)

```js
module.exports = (req, res) => {
  const session = await getSession(req, res);
  res.end(
    `In this session, you have visited this website ${session.views} time(s).`
  );
};
```

[Node.js HTTP Server](https://nodejs.org/api/http.html)

```js
const http = require("http");

const server = http.createServer(async (req, res) => {
  const session = await getSession(req, res);
  res.end(`In this session, you have visited this website ${session.views} time(s).`;
});
server.listen(8080);
```

## Options

`next-session` accepts the properties below.

| options         | description                                                                                                                                  | default                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| name            | The name of the cookie to be read from the request and set to the response.                                                                  | `sid`                                    |
| store           | The session store instance to be used. **Required** to work in production!                                                                   | `MemoryStore`                            |
| genid           | The function that generates a string for a new session ID.                                                                                   | [`nanoid`](https://github.com/ai/nanoid) |
| encode          | Transforms session ID before setting cookie. It takes the raw session ID and returns the decoded/decrypted session ID.                       | undefined                                |
| decode          | Transforms session ID back while getting from cookie. It should return the encoded/encrypted session ID                                      | undefined                                |
| touchAfter      | Only touch after an amount of time **(in seconds)** since last access. Disabled by default or if set to `-1`. See [touchAfter](#touchAfter). | `-1` (Disabled)                          |
| autoCommit      | Automatically commit session. Disable this if you want to manually `session.commit()`                                                        | `true`                                   |
| cookie.secure   | Specifies the boolean value for the **Secure** `Set-Cookie` attribute.                                                                       | `false`                                  |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute.                                                                     | `true`                                   |
| cookie.path     | Specifies the value for the **Path** `Set-Cookie` attribute.                                                                                 | `/`                                      |
| cookie.domain   | Specifies the value for the **Domain** `Set-Cookie` attribute.                                                                               | unset                                    |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute.                                                                             | unset                                    |
| cookie.maxAge   | **(in seconds)** Specifies the value for the **Max-Age** `Set-Cookie` attribute.                                                             | unset (Browser session)                  |

### touchAfter

Touching refers to the extension of session lifetime, both in browser (by modifying `Expires` attribute in [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) header) and session store (using its respective method) upon access. This prevents the session from being expired after a while.

In `autoCommit` mode (which is enabled by default), for optimization, a session is only touched, not saved, if it is not modified. The value of `touchAfter` allows you to skip touching if the session is still recent, thus, decreasing database load.

### encode/decode

You may supply a custom pair of function that _encode/decode_ or _encrypt/decrypt_ the cookie on every request.

```javascript
// `express-session` signing strategy
const signature = require("cookie-signature");
const secret = "keyboard cat";
session({
  decode: (raw) => signature.unsign(raw.slice(2), secret),
  encode: (sid) => (sid ? "s:" + signature.sign(sid, secret) : null),
});
```

## API

### session object

This allows you to **set** or **get** a specific value that associates to the current session.

```javascript
//  Set a value
if (loggedIn) session.user = "John Doe";
//  Get a value
const currentUser = session.user; // "John Doe"
```

### session.touch()

Manually extends the session expiry by maxAge. **Note:** You must still call session.commit() if `autoCommit = false`.

```js
session.touch();
```

If `touchAfter` is set with a non-negative value, this will be automatically called accordingly.

### session.destroy()

Destroy to current session and remove it from session store.

```javascript
if (loggedOut) await session.destroy();
```

### session.commit()

Save the session and set neccessary headers. Return Promise. It must be called before _sending the headers (`res.writeHead`) or response (`res.send`, `res.end`, etc.)_.

You **must** call this if `autoCommit` is set to `false`.

```javascript
session.hello = "world";
await session.commit();
// always calling res.end or res.writeHead after the above
```

### session.id

The unique id that associates to the current session.

## Session Store

The session store to use for session middleware (see `options` above).

### Implementation

A compatible session store must include three functions: `set(sid, session)`, `get(sid)`, and `destroy(sid)`. The function `touch(sid, session)` is recommended. All functions must return **Promises**.

Refer to [MemoryStore](https://github.com/hoangvvo/next-session/blob/master/src/memory-store.ts).

_TypeScript:_ the `SessionStore` type can be used to aid implementation:

```ts
import type { SessionStore } from "next-session";

class CustomStore implements SessionStore {}
```

### Compatibility with Express/Connect stores

#### Promisify functions

To use [Express/Connect stores](https://github.com/expressjs/session#compatible-session-stores), you must promisify `get`, `set`, `destroy`, and (if exists) `touch` methods, possibly using [`util.promisify`](https://nodejs.org/dist/latest/docs/api/util.html#util_util_promisify_original).

We include the util [`promisifyStore`](./src/compat.ts#L29) in `next-session/lib/compat` to do just that:

```js
import nextSession from "next-session";
import { promisifyStore } from "next-session/lib/compat";
import SomeConnectStore from "connect-xyz";

const connectStore = new SomeConnectStore();

const getSession = nextSession({
  store: promisifyStore(connectStore),
});
```

You can use `expressSession` from `next-session/lib/compat` if the connect store has the following pattern.

```javascript
const session = require("express-session");
const RedisStore = require("connect-redis")(session);

// Use `expressSession` from `next-session/lib/compat` as the replacement

import nextSession from "next-session";
import { expressSession, promisifyStore } from "next-session/lib/compat";
import RedisStoreFactory from "connect-redis";
import Redis from "ioredis";

const RedisStore = RedisStoreFactory(expressSession);
export const getSession = nextSession({
  store: promisifyStore(
    new RedisStore({
      client: new Redis(),
    })
  ),
});
```

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
