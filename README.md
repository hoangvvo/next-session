# next-session

[![npm](https://badgen.net/npm/v/next-session)](https://www.npmjs.com/package/next-session)
[![minified size](https://badgen.net/bundlephobia/min/next-session)](https://bundlephobia.com/result?p=next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Simple *promise-based* session middleware. Supports [Next.js](https://nextjs.org/).

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

```javascript
const session = require('next-session');

app.use(session(opts));


```

## API

### session(options)

### options

`next-session` accepts the properties below.

| options | description | default |
|---------|-------------|---------|
| name | The name of the cookie to be read from the request and set to the response. | `sessionId` |
| store | The session store instance to be used. | `MemoryStore` |
| genid | The function that generates a string for a new session ID. | `crypto.randomBytes(16).toString('hex')` |
| rolling | Force the cookie to be set on every request despite no modification, which extends the life time of the cookie in the browser | `false` |
| touchAfter | Only touch the session store after an amount of time, except when the session is modified, to decrease database load. Setting the value to `-1` will disable `touch()`. | `0` (Touch every time) |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. | `/` |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. | unset |
| cookie.maxAge | Specifies the value for the **Max-Age** `Set-Cookie` attribute. | unset (Session) |

### req.session

This allows you to **set** or **get** a specific value that associates to the current session.

```javascript
//  Set a value
if (loggedIn) req.session.user = 'John Doe';
//  Get a value
const currentUser = req.session.user; // "John Doe"
```

#### req.session.destroy()

Destroy to current session and remove it from session store.

```javascript
if (loggedOut) req.session.destroy();
```

#### req.session.id

The unique id that associates to the current session.

### Session Store

The session store to use for session middleware (see `options` above).

#### Implementation

A compatible session store must extend from `./src/session/store` and include three functions: `set(sid)`, `get(sid)`, and `destroy(sid)`. The function `touch(sid, session)` is recommended. The store may emit `store.emit('disconnect')` or `store.emit('connect')` to inform its readiness.

All functions should return **Promises** (*callbacks* are not supported). For an example of a session store implementation, see [`MemoryStore`](src/session/memory.js).

Stores that use callbacks will be promisified using `util.promisify`.

#### Compatible stores

Make a PR to add your own compatible stores here.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
