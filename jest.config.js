module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*'],
  testMatch: ['**/*.test.js'],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  bail: true,
};
