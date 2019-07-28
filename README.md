# next-session

Simple *promise-based* session middleware for [Next.js](https://nextjs.org/) 9 API Routes.

## Installation

```sh
npm install --save next-session
```

## Usage

```javascript
import session from 'next-session';

const handler = (req, res) => {
  if (req.session.views) {
    //  On later visits, increase # of views by one on every request
    req.session.views += 1;
  } else {
    //  On first visit, set # of views to 1
    req.session.views = 1;
  }
  res.send(`In this session, you have visited this website ${req.session.views} time(s).`)
};

//  wrap handler with session middleware and include options
export default session(handler, {
  name: 'sid',
  cookies: {
    secure: true,
    maxAge: 1209600000,
  },
});
```

### Using global middleware

In reality, you would not want to wrap `session()` around handler in every function. You may run into situation where configuration of one `session()` is different from other. One solution is to create a *global* middleware.

Create `middleware.js`.

```javascript
import session from 'next-session';

const middleware = handler => session(your(other(middlewares(handler))), { ...options});

export default middleware;
```

In each API Route, import and wrap `middleware` instead.

```javascript
import middleware from 'path/to/your/middleware';

const handler = (req, res) => {
  //  your handle
};

export default middleware(handler);
```

### session(handler, options)

Create a session middleware for `handler` with the given `options`.

#### handler

See Next.js 9 [API Routes](https://nextjs.org/docs#api-routes).

#### options

`next-session` accepts the properties below.

| options | description | default |
|---------|-------------|---------|
| name | The name of the cookie to be read from the request and set to the response. | `sessionId` |
| store | The session store instance to be used. | `MemoryStore` |
| storePromisify | *(experimental feature)* Promisify stores that are callback based. This allows you to use `next-session` with Connect stores (ex. used in [express-session](https://github.com/expressjs/session)) | `false` |
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

A compatible session store must include three functions: `set(sid)`, `get(sid)`, and `destroy()`.

All functions should return **Promises** (*callbacks* are not supported). For an example of a session store implementation, see [`MemoryStore`](src/session/memory.js).

*Experimental version only:* Store that does callback may be used by setting `storePromisify` to **true**.

#### Compatible stores

Make a PR to add your own compatible stores here.

*Experimental version only:* See [express-session compatible stores](https://github.com/expressjs/session#compatible-session-stores)

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
