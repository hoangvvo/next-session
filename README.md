# next-session

[![npm](https://badgen.net/npm/v/next-session)](https://www.npmjs.com/package/next-session)
[![minified size](https://badgen.net/bundlephobia/min/next-session)](https://bundlephobia.com/result?p=next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Simple *promise-based* session middleware for [Next.js](https://github.com/zeit/next.js). Also works in [micro](https://github.com/zeit/micro) or [Node.js HTTP Server](https://nodejs.org/api/http.html), [Express](https://github.com/expressjs/express), and more.

> For a more battle-tested solution, you should use [express-session](https://github.com/expressjs/session) with [next-connect](https://github.com/hoangvvo/next-connect) instead.

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

`next-session` has several named exports:

- `session` to be used as a Connect/Express middleware. (Use [next-connect](https://github.com/hoangvvo/next-connect) if used in Next.js)
- `withSession` to be used as HOC in Page Components or API Routes wrapper (and several others).
- `applySession`, to manually initialize `next-session` by providing `req` and `res`.

Use **one of them** to work with `next-session`. Can also be used in other frameworks in the same manner as long as they have `(req, res)` handler signature.

**Warning** The default session store, `MemoryStore`, should not be used in production since it does not persist nor work in Serverless.

### API Routes

Usage in API Routes may result in `API resolved without sending a response`. This can be solved by either adding:

```js
export const config = {
  api: {
    externalResolver: true,
  },
}
```

...or setting `options.autoCommit` to `false` and do `await session.commit()` (See [this](https://github.com/hoangvvo/next-session#reqsessioncommit)).

#### `{ session }`

```javascript
import { session } from 'next-session';
import nextConnect from 'next-connect';

const handler = nextConnect()
  .use(session({ ...options }))
  .all(() => {
    req.session.views = req.session.views ? req.session.views + 1 : 1;
    res.send(
      `In this session, you have visited this website ${req.session.views} time(s).`
    );
  })

export default handler;
```

#### `{ withSession }`

```javascript
import { withSession } from 'next-session';

function handler(req, res) {
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  res.send(
    `In this session, you have visited this website ${req.session.views} time(s).`
  );
}
export default withSession(handler, options);
```

#### `{ applySession }`

```javascript
import { applySession } from 'next-session';

export default async function handler(req, res) {
  await applySession(req, res, options);
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  res.send(
    `In this session, you have visited this website ${req.session.views} time(s).`
  );
}
```

### Pages

`next-session` does not work in [Custom App](https://nextjs.org/docs/advanced-features/custom-app) since it leads to deoptimization.

#### ~~`{ withSession }` ([`getInitialProps`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps))~~

**This will be deprecated in the next major release!**

> `next@>9.3.0` recommends using `getServerSideProps` instead of `getInitialProps`.
> Also, it is not reliable since `req` or `req.session` is only available on [server only](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps#context-object)

```javascript
import { withSession } from 'next-session';

function Page({ views }) {
  return (
    <div>In this session, you have visited this website {views} time(s).</div>
  );
}

Page.getInitialProps = ({ req }) => {
  let views;
  if (typeof window === 'undefined') {
    // req.session is only available on server-side.
    req.session.views = req.session.views ? req.session.views + 1 : 1;
    views = req.session.views;
  }
  // WARNING: On client-side routing, neither req nor req.session is available.
  return { views };
};

export default withSession(Page, options);
```

#### `{ applySession }` ([`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering))

```javascript
import { applySession } from 'next-session';

export default function Page({views}) {
  return (
    <div>In this session, you have visited this website {views} time(s).</div>
  );
}

export async function getServerSideProps({ req, res }) {
  await applySession(req, res, options);
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  return {
    props: {
      views: req.session.views
    }
  }
}
```

## Options

Regardless of the above approaches, to avoid bugs, you want to reuse the same `options` to in every route. For example:

```javascript
// Define the option only once
// foo/bar/session.js
export const options = { ...someOptions };

// Always import it at other places
// pages/index.js
import { options } from 'foo/bar/session';
/* ... */
export default withSession(Page, options);
// pages/api/index.js
import { options } from 'foo/bar/session';
/* ... */
await applySession(req, res, options);
```

`next-session` accepts the properties below.

| options | description | default |
|---------|-------------|---------|
| name | The name of the cookie to be read from the request and set to the response. | `sid` |
| store | The session store instance to be used. | `MemoryStore` |
| genid | The function that generates a string for a new session ID. | [`nanoid`](https://github.com/ai/nanoid) |
| encode | Transforms session ID before setting cookie. It takes the raw session ID and returns the decoded/decrypted session ID. | undefined |
| decode | Transforms session ID back while getting from cookie. It should return the encoded/encrypted session ID | undefined |
| touchAfter | Only touch after an amount of time. Disabled by default or if set to `-1`. See [touchAfter](#touchAfter). | `-1` (Disabled) |
| autoCommit | Automatically commit session. Disable this if you want to manually `session.commit()` | `true` |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. | `/` |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. | unset |
| cookie.maxAge | **(in seconds)** Specifies the value for the **Max-Age** `Set-Cookie` attribute. | unset (Browser session) |

### touchAfter

Touching refers to the extension of session lifetime, both in browser (by modifying `Expires` attribute in [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) header) and session store (using its respective method). This prevents the session from being expired after a while.

In `autoCommit` mode (which is enabled by default), for optimization, a session is only touched, not saved, if it is not modified. The value of `touchAfter` allows you to skip touching if the session is still recent, thus, decreasing database load.

### encode/decode

You may supply a custom pair of function that *encode/decode* or *encrypt/decrypt* the cookie on every request.

```javascript
// `express-session` signing strategy
const signature = require('cookie-signature');
const secret = 'keyboard cat';
session({
  decode: (raw) => signature.unsign(raw.slice(2), secret),
  encode: (sid) => (sid ? 's:' + signature.sign(sid, secret) : null),
});
```

## API

### req.session

This allows you to **set** or **get** a specific value that associates to the current session.

```javascript
//  Set a value
if (loggedIn) req.session.user = 'John Doe';
//  Get a value
const currentUser = req.session.user; // "John Doe"
```

### req.session.destroy()

Destroy to current session and remove it from session store.

```javascript
if (loggedOut) await req.session.destroy();
```

### req.session.commit()

Save the session and set neccessary headers. Return Promise. It must be called before *sending the headers (`res.writeHead`) or response (`res.send`, `res.end`, etc.)*.

You **must** call this if `autoCommit` is set to `false`.

```javascript
req.session.hello = 'world';
await req.session.commit();
// always calling res.end or res.writeHead after the above
```

### req.session.id

The unique id that associates to the current session.

### req.session.isNew

Return *true* if the session is new.

## Session Store

The session store to use for session middleware (see `options` above).

### Compatibility with Express/Connect stores

To use [Express/Connect stores](https://github.com/expressjs/session#compatible-session-stores), you may need to use `expressSession` from `next-session` if the store has the following pattern.

```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

// Use `expressSession` as the replacement

import { expressSession } from 'next-session';
const MongoStore = require('connect-mongo')(expressSession);
```

### Implementation

A compatible session store must include three functions: `set(sid, session)`, `get(sid)`, and `destroy(sid)`. The function `touch(sid, session)` is recommended. All functions can either return **Promises** or allowing **callback** in the last argument.

```js
// Both of the below work!

function get(sid) {
  return promiseGetFn(sid)
}

function get(sid, done) {
  cbGetFn(sid, done);
}
```

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
