import session from "../src/session";
import { commitHeader, hash } from "../src/utils";

describe("hash()", () => {
  test("stringify the session without cookie and non-enumerable fields", async () => {
    const req = {} as any;
    const res = {} as any;
    await session({
      autoCommit: false,
    })(req, res);
    req.session.foo = "bar";
    expect(hash(req.session)).toEqual(`{"foo":"bar"}`);
  });
});

describe("commitHeader()", () => {
  test("return if res.headersSent is true", () => {
    const res = {
      headersSent: true,
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    } as any;
    commitHeader(res, "sid", { cookie: {} as any, id: "id" });
    expect(res.setHeader).not.toBeCalled();
    expect(res.getHeader).not.toBeCalled();
  });

  test("encode id with encodeFn", () => {
    const res = {
      getHeader() {
        return undefined;
      },
      setHeader: jest.fn(),
    } as any;
    commitHeader(res, "sid", { cookie: {} as any, id: "id" }, () => "foo");
    expect(res.setHeader).toBeCalledWith("set-cookie", "sid=foo");
  });

  test("respect previous set-cookie headers", () => {
    const res = {
      getHeader() {
        return "foo=bar";
      },
      setHeader: jest.fn(),
    } as any;
    commitHeader(res, "sid", { cookie: {} as any, id: "id" });
    expect(res.setHeader).toBeCalledWith("set-cookie", ["foo=bar", "sid=id"]);

    const resArr = {
      getHeader() {
        return ["foo=bar", "baz=qux"];
      },
      setHeader: jest.fn(),
    } as any;
    commitHeader(resArr, "sid", { cookie: {} as any, id: "id" });
    expect(resArr.setHeader).toBeCalledWith("set-cookie", [
      "foo=bar",
      "baz=qux",
      "sid=id",
    ]);
  });
});
