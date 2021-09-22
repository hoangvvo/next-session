const assert = require("assert");
const session = require("next-session");
const { expressSession, promisifyStore } = require("next-session/lib/compat");

assert(session);
assert(expressSession);
assert(promisifyStore);
