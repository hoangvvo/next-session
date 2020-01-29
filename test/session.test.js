const Session = require('../lib/session');
const MemoryStore = require('../lib/store/memory');

describe('Session', () => {
  test('should warn if store does not implement touch', async () => {
    delete MemoryStore.prototype.touch;
    const req = { sessionStore: new MemoryStore() };
    const session = new Session(req);
    session.cookie = { resetExpires: () => {} };
    const consoleWarnSpy = jest.spyOn(global.console, 'warn');
    await session.touch();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
