import { createServer } from "http";
import request from "supertest";
import crypto from "crypto";
import EventEmitter from "events";
import { applySession, Store, MemoryStore, promisifyStore } from "../lib";

const defaultHandler = (req, res) => {
  if (req.method === "POST")
    req.session.views = req.session.views ? req.session.views + 1 : 1;
  if (req.method === "DELETE") req.session.destroy();
  res.end(`${(req.session && req.session.views) || 0}`);
};

function setUpServer(handler = defaultHandler, options, prehandler) {
  const server = createServer(async (req, res) => {
    if (prehandler) await prehandler(req, res);
    await applySession(req, res, options);
    await handler(req, res);
  });
  return server;
}

describe("applySession", () => {
  test("should default to MemoryStore", async () => {
    const req = {};
    const res = { end: () => null };
    await applySession(req, res);
    expect(req.sessionStore).toBeInstanceOf(MemoryStore);
  });

  test("should do nothing if req.session is defined", async () => {
    const server = setUpServer(defaultHandler, undefined, req => {
      req.session = {};
    });
    await request(server)
      .get("/")
      .then(({ header }) => expect(header).not.toHaveProperty("set-cookie"));
  });

  test("should create and persist session", async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post("/")
      .then(({ header }) => expect(header).toHaveProperty("set-cookie"));
    await agent
      .get("/")
      .expect("1")
      .then(({ header }) => expect(header).not.toHaveProperty("set-cookie"));
  });

  test("should destroy session and refresh sessionId", async () => {
    const server = setUpServer(defaultHandler);
    const agent = request.agent(server);
    await agent
      .post("/")
      .then(({ header }) => expect(header).toHaveProperty("set-cookie"));
    await agent
      .get("/")
      .expect("1")
      .then(({ header }) => expect(header).not.toHaveProperty("set-cookie"));
    await agent.delete("/");
    await agent
      .get("/")
      .expect("0")
      .then(({ header }) => expect(header).toHaveProperty("set-cookie"));
    //  should set cookie since session was destroyed
  });

  test("should allow manually committing session", async () => {
    const server = setUpServer(
      async (req, res) => {
        req.session.hello = "world";
        if (req.method === "POST") await req.session.commit();
        res.end((req.session && req.session.hello) || "");
      },
      { autoCommit: false }
    );
    const agent = request.agent(server);
    await agent
      .get("/")
      .then(({ header }) => expect(header).not.toHaveProperty("set-cookie"));
    await agent
      .post("/")
      .then(({ header }) => expect(header).toHaveProperty("set-cookie"));
  });

  test("should respect touchAfter", async () => {
    const server = setUpServer(
      (req, res) => {
        req.session.hello = "world";
        res.end(`${req.session.cookie.expires.valueOf()}`);
      },
      { rolling: true, touchAfter: 5000, cookie: { maxAge: 60 * 60 * 24 } }
    );
    const agent = request.agent(server);
    await agent.post("/");
    let originalExpires;
    await agent.get("/").then(res => {
      originalExpires = res.text;
    });
    const res = await agent.get("/");
    expect(res.text).toStrictEqual(originalExpires);
    // should not set-cookie despite rolling=true
    expect(res.header).not.toHaveProperty("set-cookie");
  });

  test("should expire session", async () => {
    const server = setUpServer(defaultHandler, { cookie: { maxAge: 1 } });
    const agent = request.agent(server);
    await agent.post("/").expect("1");
    await agent.post("/").expect("2");
    await new Promise(resolve => {
      setTimeout(() => resolve(), 1000);
    });
    await agent.post("/").expect("1");
  });

  test("should handle multiple res.end correctly", async () => {
    //  https://github.com/hoangvvo/next-session/pull/31
    const server = setUpServer((req, res) => {
      res.end("Hello, world!");
      res.end();
    });
    await request(server)
      .get("/")
      .expect("Hello, world!");
  });
});

describe("Store", () => {
  test("should extend EventEmitter", () => {
    expect(new Store()).toBeInstanceOf(EventEmitter);
  });
  test("should convert String() expires to Date() expires", () => {
    const store = new Store();
    const req = {};
    const res = {};
    let sess = store.generate(
      req,
      res,
      crypto.randomBytes(16).toString("hex"),
      { maxAge: 100000 }
    );
    //  force sess.cookie.expires to be string
    sess = JSON.parse(JSON.stringify(sess));
    store.createSession(req, res, sess);
    expect(req.session.cookie.expires).toBeInstanceOf(Date);
  });
  test("should allow store subclasses to use Store.call(this)", () => {
    // Some express-compatible stores use this pattern like
    // https://github.com/voxpelli/node-connect-pg-simple/blob/master/index.js
    function SubStore(options) {
      options = options || {};
      Store.call(this, options);
    }
    // eslint-disable-next-line no-unused-vars
    const store = new SubStore();
  });
});

describe("promisifyStore", () => {
  test("can promisify callback store", async () => {
    class CbStore extends Store {
      constructor() {
        super();
        this.sessions = 1;
      }

      /* eslint-disable no-unused-expressions */
      get(sid, cb) {
        cb && cb(null, this.sessions);
      }

      set(sid, sess, cb) {
        cb && cb(null, this.sessions);
      }

      destroy(sid, cb) {
        cb && cb(null, this.sessions);
      }

      touch(sid, cb) {
        cb && cb(null, this.sessions);
      }
    }

    const req = {};
    const res = { end: () => null };
    applySession(req, res, { store: promisifyStore(new CbStore()) });
    // facebook/jest#2549
    expect(req.sessionStore.get().constructor.name).toStrictEqual("Promise");
    expect(req.sessionStore.set().constructor.name).toStrictEqual("Promise");
    expect(req.sessionStore.destroy().constructor.name).toStrictEqual(
      "Promise"
    );
    expect(req.sessionStore.touch().constructor.name).toStrictEqual("Promise");
  });
});
