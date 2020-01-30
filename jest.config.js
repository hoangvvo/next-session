module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['lib/**/*'],
  testMatch: ['**/*.test.js'],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  bail: true,
};
