const { parseToMs } = require('../src/session/utils');

describe('parseToMs()', () => {
  test.each([
    ['50 seconds', 50000],
    ['50 minutes', 3000000],
    ['12 hours', 43200000],
    ['25 days', 2160000000],
    ['5 months', 12960000000],
    ['1 year', 31536000000],
  ])(
    'parse 1 keyword',
    (input, expected) => {
      expect(parseToMs(input)).toStrictEqual(expected);
    },
  );
  test.each([
    ['12 hours 50 minutes', 43200000 + 3000000],
    ['5 months 25 days 50 seconds', 12960000000 + 2160000000 + 50000],
    ['1 years 5 months 25 days 12 hours 50 minutes 50 seconds ', 31536000000 + 12960000000 + 2160000000 + 43200000 + 3000000 + 50000],
  ])(
    'parse > 1 keyword',
    (input, expected) => {
      expect(parseToMs(input)).toStrictEqual(expected);
    },
  );
  test.each([
    ['12345678', 12345678],
    [987654321, 987654321],
  ])(
    'parse miliseconds',
    (input, expected) => {
      expect(parseToMs(input)).toStrictEqual(expected);
    },
  );
});
