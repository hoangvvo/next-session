const assert = require("assert");
const session = require("next-session").default;
const { expressSession, promisifyStore } = require("next-session/lib/compat");

assert(session);
assert(expressSession);
assert(promisifyStore);

session();
