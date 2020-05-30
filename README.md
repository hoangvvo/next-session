# next-session

[![npm](https://badgen.net/npm/v/next-session)](https://www.npmjs.com/package/next-session)
[![minified size](https://badgen.net/bundlephobia/min/next-session)](https://bundlephobia.com/result?p=next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Simple *promise-based* session middleware for [Next.js](https://github.com/zeit/next.js). Also works in [micro](https://github.com/zeit/micro) or [Node.js HTTP Server](https://nodejs.org/api/http.html), [Express](https://github.com/expressjs/express), and more.

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

#### `{ withSession }` ([`getInitialProps`](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps))

*Note: This usage is not recommended. `next@>9.3.0` recommends using `getServerSideProps` instead of `getInitialProps`.*
**This will work on [server only](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps#context-object) (first render)**.

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

If you want session to always be available, consider using `{ applySession }` in `getServerSideProps`.

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
| touchAfter | Only touch (extend session lifetime despite no modification) after an amount of time to decrease database load. Setting the value to `-1` will disable `touch()`. | `0` (Touch every time) |
| rolling | Extends the life time of the cookie in the browser if the session is touched. This respects touchAfter. | `false` |
| autoCommit | Automatically commit session. Disable this if you want to manually `session.commit()` | `true` |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. | `/` |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. | unset |
| cookie.maxAge | **(in seconds)** Specifies the value for the **Max-Age** `Set-Cookie` attribute. | unset (Browser session) |

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

// async function is also supported
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
if (loggedOut) req.session.destroy();
```

### req.session.commit()

Save the session and set neccessary headers and return Promise. Use this if `autoCommit` is set to `false`. It must be called before sending response.

```javascript
req.session.hello = 'world';
await req.session.commit();
// calling res.end or finishing the resolver after the above
```

### req.session.id

The unique id that associates to the current session.

## Session Store

The session store to use for session middleware (see `options` above).

### Compatibility with Express/Connect stores

To use [Express/Connect stores](https://github.com/expressjs/session#compatible-session-stores), use `expressSession` and `promisifyStore` from `next-session`.

```javascript
import { expressSession, promisifyStore } from 'next-session';
const MongoStore = require('connect-mongo')(expressSession);
const options = {
  store: promisifyStore(new MongoStore(options))
}
```

### Implementation

A compatible session store must include three functions: `set(sid, session)`, `get(sid)`, and `destroy(sid)`. The function `touch(sid, session)` is recommended. All functions must return **Promises** (*callbacks* are not supported or must be promisified like above).

The store may emit `store.emit('disconnect')` or `store.emit('connect')` to inform its readiness. (only works with `{ session }`)

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
