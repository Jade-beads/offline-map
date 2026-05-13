module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/unit/**/*.spec.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': '<rootDir>/test/vue-sfc-script-transformer.js'
  },
  moduleNameMapper: {
    '^bun:test$': '<rootDir>/test/jest-bun-test-shim.js'
  },
  collectCoverageFrom: [
    'src/map/**/*.js',
    'src/loca/**/*.js',
    'src/map-business/**/*.js',
    'src/components/**/*.vue'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ]
}
