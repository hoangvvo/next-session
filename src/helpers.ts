import session from "./session";
import {
  isNew as isNewSymbol,
  isTouched as isTouchedSymbol,
  isDestroyed as isDestroyedSymbol,
} from "./symbol";

export function isNew(session: any) {
  return session[isNewSymbol];
}

export function isTouched(session: any) {
  return session[isTouchedSymbol];
}

export function isDestroyed(session: any) {
  return session[isDestroyedSymbol];
}
