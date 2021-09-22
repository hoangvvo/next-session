import assert from "assert";
import session from "next-session";
import { expressSession, promisifyStore } from "next-session/lib/compat";

assert(session);
assert(expressSession);
assert(promisifyStore);

session();
