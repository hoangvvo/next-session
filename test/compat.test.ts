import { EventEmitter } from "stream";
import expressSession from "../src/compat";

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
