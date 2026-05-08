module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/tests/**/*.test.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^bun:test$': '<rootDir>/test/jest-bun-test-shim.js'
  },
  collectCoverageFrom: [
    'src/map/**/*.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ]
}
