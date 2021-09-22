import MemoryStore from "../src/memory-store";

describe("MemoryStore", () => {
  test("get session from store", async () => {
    const store = new MemoryStore();
    store.store.set("foo", JSON.stringify({ foo: "bar", cookie: {} }));
    expect(await store.get("foo")).toEqual({ foo: "bar", cookie: {} });
    expect(await store.get("fuz")).toEqual(null);
  });

  test("get null if session is expired", async () => {
    const store = new MemoryStore();
    store.store.set(
      "foo",
      JSON.stringify({
        foo: "bar",
        cookie: { expires: new Date(Date.now() - 1) },
      })
    );
    expect(await store.get("foo")).toEqual(null);
    expect(store.store.has("foo")).toBe(false);
  });

  test("set session to store", async () => {
    const store = new MemoryStore();
    await store.set("foo", { foo: "bar", cookie: {} as any });
    expect(store.store.get("foo")).toEqual(
      JSON.stringify({ foo: "bar", cookie: {} })
    );
  });

  test("destroy session", async () => {
    const store = new MemoryStore();
    store.store.set("foo", JSON.stringify({ foo: "bar" }));
    await store.destroy("foo");
    expect(store.store.has("foo")).toBe(false);
  });

  test("touch session", async () => {
    const store = new MemoryStore();
    const _now = Date.now();
    store.store.set(
      "foo",
      JSON.stringify({
        foo: "bar",
        cookie: { expires: new Date(_now - 1) } as any,
      })
    );
    await store.touch("foo", {
      foo: "bar",
      cookie: { expires: new Date(_now + 1) } as any,
    });
    expect(store.store.get("foo")).toEqual(
      JSON.stringify({
        foo: "bar",
        cookie: { expires: new Date(_now + 1) } as any,
      })
    );
  });
});
