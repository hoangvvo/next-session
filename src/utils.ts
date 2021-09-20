import { serialize } from "cookie";
import { ServerResponse } from "http";
import { Options, SessionData } from "./types";

export function hash(sess: SessionData) {
  return JSON.stringify(sess, (key, val) =>
    key === "cookie" ? undefined : val
  );
}

export function commitHeader(
  res: ServerResponse,
  name: string,
  { cookie, id }: SessionData,
  encodeFn?: Options["encode"]
) {
  if (res.headersSent) return;
  const cookieStr = serialize(name, encodeFn ? encodeFn(id) : id, {
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    expires: cookie.expires,
    domain: cookie.domain,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
  });

  const prevSetCookie = res.getHeader("set-cookie");

  if (prevSetCookie) {
    if (Array.isArray(prevSetCookie)) {
      res.setHeader("set-cookie", [...prevSetCookie, cookieStr]);
    } else {
      res.setHeader("set-cookie", [prevSetCookie as string, cookieStr]);
    }
  } else {
    res.setHeader("set-cookie", cookieStr);
  }
}
