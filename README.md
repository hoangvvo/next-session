# next-session

![npm](https://badgen.net/npm/v/next-session)
[![CircleCI](https://circleci.com/gh/hoangvvo/next-session.svg?style=svg)](https://circleci.com/gh/hoangvvo/next-session)
[![codecov](https://codecov.io/gh/hoangvvo/next-session/branch/master/graph/badge.svg)](https://codecov.io/gh/hoangvvo/next-session)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](CONTRIBUTING.md)

Simple *promise-based* session middleware for [Next.js](https://nextjs.org/).

## Installation

```sh
npm install next-session
```

## Usage

:point_right: **Upgrading from v1.x to v2.x?** Please read the release notes [here](https://github.com/hoangvvo/next-session/releases/tag/v2.0.0)!

See a real-life usage in [nextjs-mongodb-app](https://github.com/hoangvvo/nextjs-mongodb-app).

There are two ways to use `next-session`. You can either:

- Wrap the component (or API handler) with `withSession`.
- `await useSession(req, res)` at the beginning of `getInitialProps` or API Routes's `handler`.

### API Routes

`next-session` can be used in **Next.js 9 [API Routes](https://nextjs.org/docs#api-routes])**. (those in `/pages/api/`)

#### Using `withSession`

```javascript
import { withSession } from 'next-session';

const handler = (req, res) => {
  req.session.views = req.session.views ? (req.session.views + 1) : 1;
  res.send(`In this session, you have visited this website ${req.session.views} time(s).`)
};
export default withSession(handler, { ...yourOptions });
```

##### :bulb: Bonus tip: Using global middleware

In reality, you would not want to wrap `withSession()` around handler in every function. You may run into situation where configuration of one `withSession()` is different from other. One solution is to create a *global* middleware.

Create `withMiddleware.js`.

```javascript
import { withSession } from 'next-session';

const withMiddleware = handler => withSession(your(other(middlewares(handler))), { ...options});

export default withMiddleware;
```

In each API Route, import and wrap `middleware` instead.

```javascript
import withMiddleware from 'path/to/your/withMiddleware';

const handler = (req, res) => {
  //  Your code
};

export default withMiddleware(handler);
```

#### Using `useSession`

```javascript
import { useSession } from 'next-session';

const handler = async (req, res) => {
  await useSession(req, res);
  req.session.views = req.session.views ? (req.session.views + 1) : 1;
  res.send(`In this session, you have visited this website ${req.session.views} time(s).`)
};
export default handler;
```

### _app.js, _document.js, and pages

`next-session` can be used in **`_app.js`, `_document.js`, and pages**. (those not in `/pages/api/` but in `/pages/`). Generally, you want to use it in `_app.js` or `_document.js` for `req.session` to available globally.

:rotating_light: Please be aware that `next-session` (as well as session stores) only work server-side. `getInitialProps`, however, will also be bundled in client-side. It is recommended to `require/import` the packages under the condition of `!process.browser`.

```javascript
if (!process.browser) {
   const sessionStore = require('sessionStore');
   // usage with `next-session` and your own logic here
}
```

#### `withSession`

```jsx
import { withSession } from 'next-session'

function Page({ views }) {
  return <div>In this session, you have visited this website {views} time(s).</div>
}

Page.getInitialProps = ({ req }) => {
  req.session.views = req.session.views ? (req.session.views + 1) : 1;
  return ({ views: req.session.views });
}

export default withSession(Page);
```

#### `useSession`

```jsx
import { useSession } from 'next-session'

function Page({ views }) {
  return <div>In this session, you have visited this website {views} time(s).</div>
}

Page.getInitialProps = async ({ req, res }) => {
  await useSession(req, res);
  req.session.views = req.session.views ? (req.session.views + 1) : 1;
  return ({ views: req.session.views });
}

export default Page;
```

##### :bulb: Recommended implementation using document middleware

`next-session` can be used with the experimental [document middleware](https://github.com/zeit/next.js/issues/7208).

In `nextjs.config.js`:

```javascript
module.exports = {
  experimental: {
    documentMiddleware: true
  }
};
```

In `_document.js`:

```javascript
export const middleware = async ({ req, res }) => {
  await useSession(req, res);
};
```

## API

### withSession(handler, options)

`handler` can either be **Next.js 9 API Routes** or an **`_app`, `_document`, or page component (with `getInitialProps`)**.

### useSession(req, res, options)

`req` and `res` are request and response objects.

In **API Routes**, this is passed from the `req` and `res` arguments.

In `_document`, or page component, this is `ctx.req` and `ctx.res`. (see [this](https://github.com/zeit/next.js/#fetching-data-and-component-lifecycle) and [this](https://github.com/zeit/next.js/#custom-document))

In `_app`, this is `appContext.ctx.req` and `appContext.ctx.res`. (see [this](https://github.com/zeit/next.js/#custom-app))

### options

`next-session` accepts the properties below.

| options | description | default |
|---------|-------------|---------|
| name | The name of the cookie to be read from the request and set to the response. | `sessionId` |
| store | The session store instance to be used. | `MemoryStore` |
| storePromisify | Promisify stores that are callback based. This allows you to use `next-session` with Connect stores (ex. used in [express-session](https://github.com/expressjs/session)) | `false` |
| generateId | The function to generate a new session ID. This needs to return a string. | `crypto.randomBytes(16).toString('hex')` |
| rolling | Force the cookie to be set on every request despite no modification, extending the life time of the cookie in the browser | `false` |
| touchAfter | On every request, the session store extends the life time of the session even when no changes are made (The same is done to Cookie). However, this may increase the load of the database. Setting this value will ask the store to only do so an amount of time since the Cookie is touched, with exception that the session is modified. Setting the value to `-1` will disable `touch()`. | `0` (Touch every time) |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. If set to true, cookie is only sent to the server with an encrypted request over the HTTPS protocol. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. If set to true, cookies are inaccessible to client-side scripts. This is to help mitigate [cross-site scripting (XSS) attacks](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting). | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. This indicates a URL path that must exist in the requested URL in order to send the Cookie header | `/` |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. Only allowed hosts to receive the cookie. If unspecified, it defaults to the  host of the current document location,  excluding subdomains. If Domain is specified, then subdomains are always included. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. This lets servers require that a cookie shouldn't be sent with cross-site (where `Site` is defined by `Domain` attribute) requests, which provides some protection against cross-site request forgery attacks ( CSRF). | unset |
| cookie.maxAge | Specifies the value for the **Max-Age** `Set-Cookie` attribute. Determine the length of time before the cookies expire. If unspecified, the cookies will expire when the client closes (Session cookies). | unset (Session) |

*For `touchAfter` and `cookie.maxAge`, you may use the following keywords: `years` (365 days), `months` (30 days), `days`, `hours`, `minutes`, `seconds`. If a number with none of the keywords above is provided, it will be assumed to be `miliseconds`. Ex: `9 months 10 days`.

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

The unique id that associates to the current session. This should not be modified.

### Session Store

The session store to use for session middleware (see `options` above).

#### Implementation

A compatible session store must include three functions: `set(sid)`, `get(sid)`, and `destroy(sid)`.

All functions should return **Promises** (*callbacks* are not supported). For an example of a session store implementation, see [`MemoryStore`](src/session/memory.js).

 Stores that return callbacks may be used by setting `storePromisify` to **true**.

#### Compatible stores

Make a PR to add your own compatible stores here.

*May be used with `storePromisify: true` :* [express-session compatible stores](https://github.com/expressjs/session#compatible-session-stores)

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
