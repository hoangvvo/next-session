# next-session

Simple session middleware for [Next.js](https://nextjs.org/) 9 API Routes.

## Installation

```sh
npm install --save next-session
```

## Usage

```javascript
// Using Node.js require
const session = require('next-session');
//  Using ES6 import
import session from 'next-session';
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
| generateId | The function to generate a new session ID. This needs to be a function that returns a string. | `crypto.randomBytes(16).toString('hex')` |
| cookie.secure | Specifies the boolean value for the **Secure** `Set-Cookie` attribute. If set to true, cookie is only sent to the server with an encrypted request over the HTTPS protocol. | `false` |
| cookie.httpOnly | Specifies the boolean value for the **httpOnly** `Set-Cookie` attribute. If set to true, cookies are inaccessible to client-side scripts. This is yo help mitigate [cross-site scripting (XSS) attacks](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting). | `true` |
| cookie.path | Specifies the value for the **Path** `Set-Cookie` attribute. This indicates a URL path that must exist in the requested URL in order to send the Cookie header | unset |
| cookie.domain | Specifies the value for the **Domain** `Set-Cookie` attribute. Only allowed hosts to receive the cookie. If unspecified, it defaults to the  host of the current document location,  excluding subdomains. If Domain is specified, then subdomains are always included. | unset |
| cookie.sameSite | Specifies the value for the **SameSite** `Set-Cookie` attribute. This lets servers require that a cookie shouldn't be sent with cross-site (where `Site` is defined by `Domain` attribute) requests, which provides some protection against cross-site request forgery attacks ( CSRF). | unset |
| cookie.maxAge | Specifies the value for the **Max-Age** `Set-Cookie` attribute. The value **must** be in miliseconds. Determine the length of time before the cookies expire. If unspecified, the cookies will expire when the client closes (Session cookies). | unset (Session) |

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

A compatible session store must includes three functions: `set(sid)`, `get(sid)`, and `destroy()`.

All functions should return **Promises** (*callbacks* are not supported). For an example of a session store implementation, see [`MemoryStore`](https://github.com/hoangvvo/next-session/blob/master/session/memory.js).

#### Compatible stores

Make a PR to add your own compatible stores here.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
