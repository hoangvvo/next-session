# Changelog

## 3.4.0

- Refactor, remove rolling option and fix unreliable tests (#283)
- Avoid override set-cookie (#320)

## 3.3.2

- Fix cookie expiry. (Fix #280)

## 3.3.1

- Fix callback store support (#273)
- Set cookie properly :facepalm:

## ~~3.3.0~~

*Broken release*

- Remove the need to use promisifyStore and refactor (#257)
- Bump dependencies

## 3.2.5

- Fix autoCommit usage with res.writeHead (#253)
- Improve types and undo #240 (#252)

## 3.2.4

- Avoid calling session.commit more than once (#240)

## 3.2.3

- Add new compatible layer for express-session stores (#157)

## 3.2.2

- Convert String expires to Date (#153)

## 3.2.1

- Improve type compatibility for promisifyStore (#151)

## 3.2.0

- Rewrite in TypeScript (#147)

## 3.1.0

- Add encode/decode options (#114)

Huge thanks to @ealtunyay and @andreisena for helping!

## 3.0.1

- [Security] Bump acorn from 6.3.0 to 6.4.1 (#86)
- Fix server hanging on redirect (#88)

## 3.0.0

- Usage in Pages: Better integration with React.js and Next.js (#63) (Using HOC pattern)
- Use nanoid for default session ID generation (#85) (Reduce 100kb of build size)
- Store no longer has to extend `nextSession.Store` (#83)
- Update documentation

**:boom: Breaking changes**

- `maxAge` is now in second and no longer parses date string (remove f487b1c).
- `useSession` is replaced with `applySession`
- `connect middleware` is now a named import:

```javascript
//  BEFORE
  import session from 'next-session';
  //  AFTER
  import { session } from 'next-session';
```

- `options.storePromisify` is removed. You must [promisify](https://github.com/hoangvvo/next-session#implementation) the store that uses callbacks using `promisifyStore`:

```javascript
// BEFORE
const options = {
  storePromisify: true,
  store: new SessionStore({ ...storeOptions })
}

// AFTER
import { promisifyStore } from 'next-session';
const options = {
  store: promisifyStore(new SessionStore({ ...storeOptions }))
};
```

## 2.2.0

### Minor

- Allow manual session commit (#59)

### Patches

- Futhur check for headersSent (dd561a71c12ab6248b02873dd50cb114046be430)

## 2.1.1

### Patches

- Only warn if store is memoryStore (1d53f7d39c48e14288b738437c4577767534c08b)

## 2.1.0

### Minor

- Add support connect style middleware (#39, #40)
- Rewrite, improve tests (#43, #45, #47)
- Fix touch implementation in MemoryStore (#44, 834910fc2359df600a50be23e5960ca94071f768)

### Patches

- Fix TypeError when req.header.cookie is undefined (#41)
- Memory Store usage should still be warned even in dev env (#42)
- Fix storeReady variable scoping (c3f7a8abe726fbfd36416873fb72144b9165699e)

## 2.0.3

### Minor*

- useSession() return session values (#36)

### Patches

- Switch to circleci and codecov (#35) (Remove dev dep `coveralls`)

## 2.0.2

### Patches

- Fix `res.end` patch to handle multiple `res.end` calls (#29)
- Fix TypeError for stores that use `Store.call` (#32)

Special thanks to @dbachrach for working on the #29 and #32.

## 2.0.1

### Patches

- Documentation: Fix View Count examples and add document middleware implementation in README. (#27)

Special thanks to @dbachrach (for pointing out `document middleware`) and @dorinesinenco for fixing the View Count example.

## 2.0.0

### Major

- :boom: default import `session()` is replaced with named import `withSession()`:

  ```javascript
  //  BEFORE
  import session from 'next-session';
  //  AFTER
  import { withSession } from 'next-session';

  //  BEFORE
  export session(handler);
  //  AFTER
  export withSession(handler);
  ```

### Minor

- :sparkles: withSession now supports getInitialProps for `_app`, `_document`, and pages. (#20)

## 1.2.1

This version drops `Bluebird`. If you care deeply about performance. Please use `Bluebird` to promisify `next-session`.

### Minor

- Remove `Babel` and rewrite with CommonJS (#18)
- Remove `Bluebird` and use native Promise (#19)

## 1.1.0

### Minor

- Add support for `getIntialProps` (#12)

## 1.0.0

:tada: **Stable release** :tada:

### Major

- Add **StorePromisify**, which provides support for `callback` stores (31c6de4233ece17de54d88b444392cd2f6574223)
- Add tests, coverages, Travis CI
- Babel now targets **Node 6+**

### Minor

- Remove `lodash.merge` dependency and to use `Object.assign`.
- Add listener for store readiness.
- Store is abstracted into `session/store.js`.

### Patches

- Correct touch() arguments (3bffc16dd566127440e3716956dc0dd7c583b710).
- Fix memoryStore not working: memoryStore must extends Store (5c9741a87bdf34c659566bc3e26b4863d8c831ec).

## 0.2.0

### Minor

- Add session touch: Extend session lifetime despite no modification. (#4)
- Add rolling option: Force cookie to be set on every request. (#4)
- Add parseToMs to parse keywords `Years`, `Months`, `Days`, etc. (f487b1c)

## 0.1.1

### Minor

- Remove lodash.isequal and lodash.omit. `next-session` now compare object hash instead of deep compare. (436feff)
- Documentation: Add global middleware usage and fix MemoryStore link. (91f03a7)

## 0.1.0

## Major

- Rewrite with **Promise**, backed by [Bluebird](https://github.com/petkaantonov/bluebird). (7fbb337, 9ab6313)

## Minor

- Change `MemoryStore` to use **Promise**. (a178ee0)
- Add global middleware approach to using `next-session`. (91f03a7)

## 0.0.2

When installing from `npm`, release **0.0.1** does not work since **node** does not support `ES6 Import/Export`. This release add babel to transpile ES6 to ES5.

Moving source code to `/src`. (f5cd9fe)
Add and config Babel 7 to transpile from `/src` to `/lib` using `@babel/preset-env`. (fd2012e)
Add a detailed example on how to use `next-session` in README.md: 1f112dc. (1f112dc)
