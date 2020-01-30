module.exports = {
  rootDir: "integration",
  testEnvironment: 'node',
  collectCoverageFrom: ['lib/**/*'],
  testMatch: ['**/*.test.js'],
  verbose: true,
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  bail: true,
};
