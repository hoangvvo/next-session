export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*'],
  testMatch: ['**/test/**/*.test.ts'],
  bail: true,
  extensionsToTreatAsEsm: ['.ts'],
  resolver: 'ts-jest-resolver',
  globals: {
    'ts-jest': {
      diagnostics: false,
      useESM: true,
    }
  }
};
