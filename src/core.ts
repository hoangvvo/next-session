import { parse as parseCookie } from "cookie";
import { nanoid } from "nanoid";
import { Store as ExpressStore } from "express-session";
import MemoryStore from "./store/memory";
import Session from "./session";
import { Options, SessionOptions, SessionData, SessionStore } from "./types";
import { IncomingMessage, ServerResponse } from "http";

export function isCallbackStore<E extends ExpressStore, S extends SessionStore>(
  store: E | S
): store is E {
  return store.get.length === 2;
}

function getOptions(opts: Options = {}): SessionOptions {
  return {
    name: opts.name || "sid",
    store: opts.store || new MemoryStore(),
    genid: opts.genid || nanoid,
    encode: opts.encode,
    decode: opts.decode,
    rolling: opts.rolling || false,
    touchAfter: opts.touchAfter ? opts.touchAfter : 0,
    cookie: opts.cookie || {},
    autoCommit: typeof opts.autoCommit !== "undefined" ? opts.autoCommit : true,
  };
}

export async function applySession<T = {}>(
  req: IncomingMessage & { session: Session<T> },
  res: ServerResponse,
  opts?: Options
): Promise<void> {
  const options = getOptions(opts);

  if (req.session) return;

  let sessId =
    req.headers && req.headers.cookie
      ? parseCookie(req.headers.cookie)[options.name]
      : null;

  if (sessId && options.decode) {
    sessId = options.decode(sessId);
  }

  (req as any).sessionStore = options.store;

  let sess: SessionData | null = null;

  if (sessId) {
    if (isCallbackStore(options.store)) {
      sess = await new Promise((resolve, reject) => {
        options.store.get(sessId as string, (err, data) => {
          // @ts-ignore
          err ? reject(err) : resolve(data || null);
        });
      });
    } else sess = await options.store.get(sessId);
  }

  if (sess) sess.id = sessId;
  req.session = new Session<T>(res, options, sess);

  // autocommit
  if (options.autoCommit) {
    const oldWritehead = res.writeHead;
    res.writeHead = function resWriteHeadProxy(...args: any) {
      req.session.commitHead();
      return oldWritehead.apply(this, args);
    };
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args: any) {
      await req.session.save();
      oldEnd.apply(this, args);
    };
  }
}
