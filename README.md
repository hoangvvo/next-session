# next-session

[![npm](https://badgen.net/npm/v/next-session)](https://www.npmjs.com/package/next-session)
[![minified size](https://badgen.net/bundlephobia/min/next-session)](https://bundlephobia.com/result?p=next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Simple *promise-based* session middleware for [Next.js](https://github.com/zeit/next.js).

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

- `withSession` to be used as higher order component or API Routes wrapper.
- `session` to be used as a Connect/Express middleware.
- `applySession`, to manually initialize `next-session` by providing `req` and `res`.

### `{ withSession }`

Named import `withSession` from `next-session`.

```javascript
import { withSession } from 'next-session';
```

#### API Routes

```javascript
function handler(req, res) {
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  res.send(
    `In this session, you have visited this website ${req.session.views} time(s).`
  );
}
export default withSession(handler, opts);
```

#### Pages (SSR only)

You can use `next-session` in `getInitialProps`. **This will work on [server only](https://nextjs.org/docs/api-reference/data-fetching/getInitialProps#context-object) (first render)**.

```javascript
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
  // On client-side routing, req.session is not available.
  return { views };
};

export default withSession(Page, opts);
```

The use case is limited due to *server only* constraint. Yet, one use case is to get `currentUser` upon landing on the site (and ideally set it to React Context for later).

For usage in both server and client-side, consider using `{ applySession }` in `getServerProps`.

### `{ session }`

This is `next-session` as a Connect middleware. Thus, you can also use it in Express.js.

```javascript
import { session } from 'next-session';

app.use(session({ ...options }));
```

One way to use this in Next.js is through [next-connect](https://github.com/hoangvvo/next-connect).

### `{ applySession }`

`applySession` is the internal function used by both `withSession` and `session` to handle session in `req` and `res`. It returns a *promise* when session is set up in `req.session`.

```javascript
import { applySession } from "next-session";
/* ... */
await applySession(req, res, opts);
// do whatever you need with req and res after this
```

#### API Routes

```javascript
export default async function handler(req, res) {
  await applySession(req, res, opts);
  res.send(
    `In this session, you have visited this website ${req.session.views} time(s).`
  );
}
```

#### Pages

If you want session to always be available in pages, `getServerProps` is recommended over `getInitialProps` because getServerProps is fully server-side, so `Session` is always available.

```javascript
export default function Page(props) {
  return (
    <div>In this session, you have visited this website {views} time(s).</div>
  );
}

export async function getServerProps({ req, res }) {
  await applySession(req, res, opts);
  req.session.views = req.session.views ? req.session.views + 1 : 1;
  return {
    props: {
      views: req.session.views
    }
  }
}
```

## API

### options

Regardless of the above approaches, to avoid bugs, you want to reuse the same `options` to in every route. For example:

```javascript
// Define the option only once
// lib/session.js
export const option = { ...someOptions };

// Always import it at other places
// pages/index.js
import { option } from '../lib/session';
/* ... */
export withSession(Page, options);
// pages/api/index.js
import { option } from '../../lib/session';
export default withSession(handler, option);

```

`next-session` accepts the properties below.

| options | description | default |
|---------|-------------|---------|
| name | The name of the cookie to be read from the request and set to the response. | `sid` |
| store | The session store instance to be used. | `MemoryStore` |
| genid | The function that generates a string for a new session ID. | `crypto.randomBytes(16).toString('hex')` |
| touchAfter | Only touch (extend session lifetime despite no modification) after an amount of time to decrease database load. Setting the value to `-1` will disable `touch()`. | `0` (Touch every time) |
| rolling | Extends the life time of the cookie in the browser if the session is touched. This respects touchAfter. | `false` |
| autoCommit | Automatically commit session. Disable this if you want to manually `session.commit()` | `true` |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. | `/` |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. | unset |
| cookie.maxAge | **(in seconds)** Specifies the value for the **Max-Age** `Set-Cookie` attribute. | unset (Browser session) |

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

Save the session and set neccessary headers and return Promise. Use this if `autoCommit` is set to `false`.

### req.session.id

The unique id that associates to the current session.

## Session Store

The session store to use for session middleware (see `options` above).

### Implementation

A compatible session store must include three functions: `set(sid)`, `get(sid)`, and `destroy(sid)`. The function `touch(sid, session)` is recommended. All functions must return **Promises** (*callbacks* are not supported). This means many Express/Connect stores are not supported as it. To use them, wrap them with `promisifyStore`:

```javascript
import { promisifyStore, withSession } from "next-session";
import ExpressSessionStore from "some-callback-store";
const options = {
  // ...
  store: promisifyStore(new ExpressSessionStore({ ...storeOptions }))
};
// ...
withSession(handler, options);
```

The store may emit `store.emit('disconnect')` or `store.emit('connect')` to inform its readiness. (only works with `{ session }`, Connect middleware version)

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
