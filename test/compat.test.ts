import { EventEmitter } from "stream";
import { callbackify } from "util";
import { expressSession, promisifyStore } from "../src/compat";
import MemoryStore from "../src/memory-store";

describe("expressSession", () => {
  test("expressSession.Store extends EventEmitter", () => {
    // @ts-ignore
    expect(new expressSession.Store()).toBeInstanceOf(EventEmitter);
  });
  test("allow expressSession.Store subclasses to use Store.call(this)", () => {
    // Some express-compatible stores use this pattern like
    // https://github.com/voxpelli/node-connect-pg-simple/blob/master/index.js
    function SubStore() {
      // @ts-ignore
      expressSession.Store.call(this);
    }
    // eslint-disable-next-line no-unused-vars
    // @ts-ignore
    const store = new SubStore();
  });
  test("expressSession.MemoryStore extends expressSession.Store", () => {
    // @ts-ignore
    expect(new expressSession.MemoryStore()).toBeInstanceOf(
      expressSession.Store
    );
  });
  describe("expressSession.MemoryStore basic functionalities", () => {
    // @ts-ignore
    const memoryStore = new expressSession.MemoryStore();
    it("get()", (done) => {
      memoryStore.get("foo", done);
    });
    it("set()", (done) => {
      memoryStore.set("foo", {}, done);
    });
    it("destroy()", (done) => {
      memoryStore.destroy("foo", done);
    });
  });
});

describe("promisifyStore", () => {
  it("promisify store methods and maintain this context", async () => {
    // @ts-ignore
    const memoryStore = new expressSession.MemoryStore();
    delete memoryStore.touch;
    memoryStore.store.set("foo", JSON.stringify({ cookie: {}, foo: "bar" }));
    const store = promisifyStore(memoryStore);
    const getPromise = store.get("foo");
    expect(getPromise).toHaveProperty("then");
    const sess = await getPromise;
    expect(sess).toEqual({ cookie: {}, foo: "bar" });
    const setPromise = store.set("bar", { cookie: {} as any, baz: "quz" });
    expect(setPromise).toHaveProperty("then");
    await setPromise;
    expect(memoryStore.store.get("bar")).toEqual(
      JSON.stringify({
        cookie: {},
        baz: "quz",
      })
    );
    const destroyPromise = store.destroy("bar");
    expect(destroyPromise).toHaveProperty("then");
    await destroyPromise;
    expect(memoryStore.store.has("bar")).toBe(false);
    // add dummy touch() function to test
    memoryStore.touch = callbackify(MemoryStore.prototype.touch);
    const touchPromise = promisifyStore(memoryStore).touch!("foo", {
      cookie: {} as any,
      foo: "bar",
    });
    expect(touchPromise).toHaveProperty("then");
  });
});
