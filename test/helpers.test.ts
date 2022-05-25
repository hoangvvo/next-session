import { isNew, isTouched, isDestroyed } from "../src/helpers";
import session from "../src/session";

describe("isNew()", () => {
  test("if returns undefined", () => {
    expect(isNew(session)).toBe(undefined);
  });
  test("if it returns a boolean", () => {
    expect(typeof isNew(session) === "boolean").toBeFalsy();
  });
});

describe("isTouched()", () => {
  test("if returns undefined", () => {
    expect(isTouched(session)).toBe(undefined);
  });
  test("if it returns a boolean", () => {
    expect(typeof isTouched(session) === "boolean").toBeFalsy();
  });
});

describe("isDestroyed()", () => {
  test("if returns undefined", () => {
    expect(isDestroyed(session)).toBe(undefined);
  });
  test("if it returns a boolean", () => {
    expect(typeof isDestroyed(session) === "boolean").toBeFalsy();
  });
});
