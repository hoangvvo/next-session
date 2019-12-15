const crypto = require('crypto');
const { promisify } = require('util');
const Store = require('./store');
const Cookie = require('./cookie');
const Session = require('./session');

const genidFn = () => crypto.randomBytes(16).toString('hex');

function hash(sess) {
  const str = JSON.stringify(sess, (key, val) =>
    key === 'cookie' ? undefined : val
  );
  return crypto
    .createHash('sha1')
    .update(str, 'utf8')
    .digest('hex');
}

let storeReady = true;

module.exports = function session(options = {}) {
  const name = options.name || 'sid';
  const cookieOptions = options.cookie || {};
  const { store } = options;
  const genid = options.genid || genidFn;
  const touchAfter = options.touchAfter || 0;
  const rollingSession = options.rolling || false;

  //  Promisify callback-based store.
  if (store.get.length > 1) store.get = promisify(store.get);
  if (store.set.length > 2) store.set = promisify(store.set);
  if (store.destroy.length > 1) store.destroy = promisify(store.destroy);
  if (store.touch && store.touch.length > 2)
    store.touch = promisify(store.touch);

  store.on('disconnect', () => {
    storeReady = false;
  });
  store.on('connect', () => {
    storeReady = true;
  });

  return (req, res, next) => {
    if (req.session || !storeReady) return next();

    req.sessionStore = store;
    req.sessionId = req.cookies[name];

    function getSession() {
      if (!req.sessionId) {
        return Promise.resolve(
          hash(req.sessionStore.generate(req, genid(), cookieOptions))
        );
      }
      return req.sessionStore.get(req.sessionId).then(sess => {
        if (sess) return hash(req.sessionStore.createSession(req, sess));
        return hash(req.sessionStore.generate(req, genid(), cookieOptions));
      });
    }

    return getSession().then(hashedsess => {
      let sessionSaved = false;
      const oldEnd = res.end;
      let ended = false;

      res.end = function resEndProxy(...args) {
        if (ended) {
          return false;
        }
        ended = true;

        function saveSession() {
          if (req.session) {
            if (hash(req.session) !== hashedsess) {
              sessionSaved = true;
              return req.session.save();
            }
            if (req.session.cookie.maxAge && touchAfter >= 0) {
              const minuteSinceTouched =
                req.session.cookie.maxAge -
                (req.session.cookie.expires - new Date());
              if (minuteSinceTouched < touchAfter) return Promise.resolve();
              return req.session.touch();
            }
          }
          return Promise.resolve();
        }

        return saveSession().then(() => {
          if (
            (req.cookies[name] !== req.sessionId ||
              sessionSaved ||
              rollingSession) &&
            req.session
          ) {
            res.setHeader(
              'Set-Cookie',
              req.session.cookie.serialize(name, req.sessionId)
            );
          }

          oldEnd.apply(this, args);
        });
      };

      next();
    });
  };
};

module.exports.Store = Store;
module.exports.Cookie = Cookie;
module.exports.Session = Session;
