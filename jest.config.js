module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*'],
  testMatch: ['**/*.test.ts'],
  bail: true,
  verbose: false,
};
