// @ts-nocheck
import { jest } from "@jest/globals";
import { createServer, IncomingMessage, request, ServerResponse } from "http";
import { inject } from "light-my-request";
import MemoryStore from "../src/memory-store";
import session from "../src/session";
import { isNew, isTouched } from "../src/symbol";
import { Session } from "../src/types";

const defaultCookie = {
  domain: undefined,
  httpOnly: true,
  path: "/",
  sameSite: undefined,
  secure: false,
};

describe("session()", () => {
  test("return a function", () => {
    expect(typeof session()).toBe("function");
  });
  test("returns the session after resolve", async () => {
    await inject(
      async (req, res) => {
        const sess = await session()(req, res);
        expect(sess).toEqual({
          cookie: defaultCookie,
          [isNew]: true,
        });
        expect(req.session).toBe(sess);
        res.end();
      },
      { path: "/" }
    );
  });
  test("return if req.session is defined", async () => {
    const store = {
      get: jest.fn(),
    };
    await inject(
      async (req, res) => {
        req.session = {};
        await session({ store })(req, res);
        res.end();
      },
      { path: "/", headers: { cookie: "sid=foo" } }
    );
    expect(store.get).not.toHaveBeenCalled();
  });
  test("not set cookie header if session is not populated", async () => {
    const res = await inject(
      async (req, res) => {
        await session()(req, res);
        res.end();
      },
      { path: "/" }
    );
    expect(res.headers).not.toHaveProperty("set-cookie");
  });
  test("should set cookie header and save session", async () => {
    const store = {
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
    };
    let id: string;
    const res = await inject(
      async (req, res) => {
        await session({ store })(req, res);
        req.session.foo = "bar";
        id = req.session.id;
        res.end();
      },
      { path: "/" }
    );
    expect(res.headers).toHaveProperty("set-cookie");
    expect(res.headers["set-cookie"]).toBe(`sid=${id}; Path=/; HttpOnly`);
    expect(store.set).toHaveBeenCalledWith(id, {
      foo: "bar",
      cookie: defaultCookie,
      [isNew]: true,
    });
    await inject(
      async (req, res) => {
        await session({ store })(req, res);
        req.session.foo = "bar";
        res.end();
      },
      { path: "/", headers: { cookie: `sid=${id}` } }
    );
    expect(store.get).toHaveBeenCalledWith(id);
  });
  test("should set cookie header and save session (autoCommit = false)", async () => {
    const store = {
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
    };
    let id: string;
    const res = await inject(
      async (req, res) => {
        await session({ store, autoCommit: false })(req, res);
        req.session.foo = "bar";
        id = req.session.id;
        await req.session.commit();
        res.end();
      },
      { path: "/" }
    );
    expect(res.headers).toHaveProperty("set-cookie");
    expect(res.headers["set-cookie"]).toBe(`sid=${id}; Path=/; HttpOnly`);
    expect(store.set).toHaveBeenCalledWith(id, {
      foo: "bar",
      cookie: defaultCookie,
      [isNew]: true,
    });
    await inject(
      async (req, res) => {
        await session({ store })(req, res);
        req.session.foo = "bar";
        res.end();
      },
      { path: "/", headers: { cookie: `sid=${id}` } }
    );
    expect(store.get).toHaveBeenCalledWith(id);
  });
  test("should destroy session and unset cookie", async () => {
    const store = new MemoryStore();
    store.destroy = jest.fn();
    store.set = jest.fn();
    store.touch = jest.fn();
    const sid = "foo";
    await store.store.set(
      sid,
      JSON.stringify({ foo: "bar", cookie: defaultCookie })
    );
    const res = await inject(
      async (req, res) => {
        await session({ store })(req, res);
        req.session.foo = "quz";
        await req.session.destroy();
        res.end();
      },
      { path: "/", headers: { cookie: `sid=${sid}` } }
    );
    expect(store.destroy).toHaveBeenCalledWith(sid);
    expect(store.set).not.toHaveBeenCalled();
    expect(store.touch).not.toHaveBeenCalled();
    expect(res.headers["set-cookie"]).toBe(
      `sid=${sid}; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
    );
  });
  test("should destroy session and unset cookie (autoCommit=false)", async () => {
    const store = new MemoryStore();
    store.destroy = jest.fn();
    store.set = jest.fn();
    store.touch = jest.fn();
    const sid = "foo";
    await store.store.set(
      sid,
      JSON.stringify({ foo: "bar", cookie: defaultCookie })
    );
    const res = await inject(
      async (req, res) => {
        await session({ store, autoCommit: false })(req, res);
        req.session.foo = "quz";
        await req.session.destroy();
        expect(req).not.toHaveProperty("session");
        res.end();
      },
      { path: "/", headers: { cookie: `sid=${sid}` } }
    );
    expect(store.destroy).toHaveBeenCalledWith(sid);
    expect(store.set).not.toHaveBeenCalled();
    expect(store.touch).not.toHaveBeenCalled();
    expect(res.headers["set-cookie"]).toBe(
      `sid=${sid}; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
    );
  });
  test("not to modify res.writeHead and res.end if autoCommit = false", async () => {
    const req = { headers: {} } as any;
    const noop = () => undefined;
    const res = { writeHead: noop, end: noop };
    await session({ autoCommit: false })(req, res);
    expect(res.end).toBe(noop);
    expect(res.writeHead).toBe(noop);
  });
  test("not make res.writeHead and res.end async", async () => {
    const req = { headers: {} } as any;
    const res = {
      writeHead() {
        return this;
      },
      end: () => undefined,
    };
    await session({ autoCommit: true })(req, res);
    expect(typeof res.end()).not.toEqual("object");
    expect(res.writeHead()).toBe(res);
  });
  test("not touch (touchAfter = -1) by default", async () => {
    const store = new MemoryStore();
    store.touch = jest.fn();
    const expires = new Date(Date.now() + 1000);
    await store.set("foo", {
      cookie: { ...defaultCookie, expires, maxAge: 5 },
    });
    const res = await inject(
      async (req, res) => {
        await session({ store })(req, res);
        expect(req.session[isTouched]).toBeFalsy();
        res.end(String(req.session.cookie.expires.getTime()));
      },
      { path: "/", headers: { cookie: "sid=foo" } }
    );
    expect(store.touch).not.toHaveBeenCalled();
    expect(Number(res.payload)).toEqual(expires.getTime());
  });
  test("touch if session life time > touchAfter", async () => {
    const store = new MemoryStore();
    store.touch = jest.fn(() => Promise.resolve());
    const expires = new Date(Date.now() + 2000);
    await store.set("foo", {
      cookie: { ...defaultCookie, expires, maxAge: 5 },
    });
    let newExpires: Date;
    const res = await inject(
      async (req, res) => {
        await session({ store, touchAfter: 1 })(req, res);
        expect(req.session[isTouched]).toBe(true);
        newExpires = req.session.cookie.expires;
        res.end();
      },
      { path: "/", headers: { cookie: "sid=foo" } }
    );
    expect(newExpires.getTime()).toBeGreaterThan(expires.getTime());
    expect(res.headers["set-cookie"]).toEqual(
      `sid=foo; Path=/; Expires=${newExpires.toUTCString()}; HttpOnly`
    );
    expect(store.touch).toHaveBeenCalledWith("foo", {
      cookie: { ...defaultCookie, expires: newExpires, maxAge: 5 },
      [isTouched]: true,
    });
  });
  test("not touch session life time < touchAfter", async () => {
    const store = new MemoryStore();
    store.touch = jest.fn(() => Promise.resolve());
    const expires = new Date(Date.now() + 2000);
    await store.set("foo", {
      cookie: { ...defaultCookie, expires, maxAge: 5 },
    });
    let newExpires: Date;
    const res = await inject(
      async (req, res) => {
        await session({ store, touchAfter: 10 })(req, res);
        expect(req.session[isTouched]).toBeFalsy();
        newExpires = req.session.cookie.expires;
        res.end();
      },
      { path: "/", headers: { cookie: "sid=foo" } }
    );
    expect(newExpires.getTime()).toEqual(expires.getTime());
    expect(res.headers).not.toHaveProperty("set-cookie");
    expect(store.touch).not.toHaveBeenCalled();
  });
  test("support calling res.end() multiple times", (done) => {
    // This must be tested with a real server to verify headers sent error
    // https://github.com/hoangvvo/next-session/pull/31
    const server = createServer(async (req, res) => {
      await session()(req, res);
      req.session.foo = "bar";
      res.end("Hello, world!");
      res.end();
    });
    server.listen(
      async (req, res) => {
        await session()(req, res);
        req.session.foo = "bar";
        res.end("Hello, world!");
        res.end();
      },
      function callback() {
        const address = this.address();
        request(`http://127.0.0.1:${address.port}/`, (res) => {
          let data = "";
          res.on("data", (d) => {
            if (d) data += d;
          });
          res.on("end", () => {
            expect(data).toEqual("Hello, world!");
            server.close(done);
          });
          res.on("error", done);
        })
          .on("error", done)
          .end();
      }
    );
  });
  test("allow encode and decode sid", async () => {
    const decode = (key: string) => {
      if (key.startsWith("sig.")) return key.substring(4);
      return null;
    };
    const encode = (key: string) => {
      return `sig.${key}`;
    };
    const store = new MemoryStore();
    const sessionFn = session({ store, encode, decode });
    let sid: string;
    const res = await inject(
      async (req, res) => {
        await sessionFn(req, res);
        req.session.foo = "bar";
        sid = req.session.id;
        res.end();
      },
      { path: "/" }
    );
    expect(res.headers["set-cookie"]).toBe(
      `sid=${encode(sid)}; Path=/; HttpOnly`
    );
    expect(store.store.has(sid)).toBe(true);
    const handler = async (
      req: IncomingMessage & { session: Session },
      res: ServerResponse
    ) => {
      await sessionFn(req, res);
      res.end(req.session.foo);
    };
    const res2 = await inject(handler, {
      path: "/",
      headers: { cookie: `sid=${encode(sid)}` },
    });
    expect(res2.payload).toEqual("bar");
    const res3 = await inject(handler, {
      path: "/",
      headers: { cookie: `sid=${sid}` },
    });
    expect(res3.payload).toEqual("");
  });
  test("set cookie correctly after res.writeHead in autoCommit", async () => {
    const res = await inject(
      async (req, res) => {
        await session()(req, res);
        req.session.foo = "bar";
        res.writeHead(302, { Location: "/login" }).end();
      },
      { path: "/" }
    );
    expect(res.headers).toHaveProperty("set-cookie");
  });
  test("should convert to date if store returns session.cookies.expires as string", async () => {
    const store = {
      get: async (id: string) => {
        //  force sess.cookie.expires to be string
        return JSON.parse(
          JSON.stringify({
            cookie: { maxAge: 100000, expires: new Date(Date.now() + 4000) },
          })
        );
      },
      set: async (sid: string, sess: SessionData) => undefined,
      destroy: async (id: string) => undefined,
    };
    await inject(
      async (req, res) => {
        await session({ store })(req, res);
        expect(req.session.cookie.expires).toBeInstanceOf(Date);
        res.end();
      },
      { path: "/", headers: { cookie: "sid=foo" } }
    );
  });
});
