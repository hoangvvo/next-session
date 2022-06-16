import { isDestroyed, isNew, isTouched } from "../src/helpers";
import {
  isDestroyed as isDestroyedSymbol, isNew as isNewSymbol,
  isTouched as isTouchedSymbol
} from "../src/symbol";

describe("isNew()", () => {
  test("returns true if session is new", () => {
    const sess = {
      [isNewSymbol]: true
    }
    expect(isNew(sess)).toBe(true);
  });
  test("returns false if session is not new", () => {
    // an existing session does not have this property
    // see line 70 src/session.ts
    const sess = {}
    expect(isNew(sess)).toBe(false);
  });
});

describe("isTouched()", () => {
  test("returns true if session is touched", () => {
    const sess = {
      [isTouchedSymbol]: true
    }
    expect(isTouched(sess)).toBe(true);
  });
  test("returns false if session is untouched", () => {
    // an untouched session does not have this property
    const sess = {}
    expect(isTouched(sess)).toBe(false);
  });
});

describe("isDestroyed()", () => {
  test("returns true if session is destroyed", () => {
    const sess = {
      [isDestroyedSymbol]: true
    }
    expect(isDestroyed(sess)).toBe(true);
  });
  test("returns false if session is destroyed", () => {
    // an undestroyed session does not have this property
    const sess = {}
    expect(isDestroyed(sess)).toBe(false);
    // when a session is destroyed, req.session will be unset
    // if a user passes in req.session, we should return false too
    expect(isDestroyed(undefined)).toBe(false);
  });
});
