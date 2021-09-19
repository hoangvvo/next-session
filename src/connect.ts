import { IncomingMessage, ServerResponse } from "http";
import { applySession } from "./core";
import { Options } from "./types";

export default function session(opts?: Options) {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: any) => void
  ) => {
    applySession(req, res, opts).then(next);
  };
}
