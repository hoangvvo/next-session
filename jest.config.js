module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*'],
  testMatch: ['**/*.test.js'],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  bail: true,
};
