export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*'],
  testMatch: ['test/unit/*.test.ts'],
  bail: true,
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      diagnostics: false,
      useESM: true,
    }
  }
};
