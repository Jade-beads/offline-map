module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/tests/unit/**/*.spec.js',
    '<rootDir>/tests/unit/**/*.spec.jsx',
    '<rootDir>/tests/unit/**/*.spec.ts',
    '<rootDir>/tests/unit/**/*.spec.tsx',
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': '<rootDir>/test/vue-sfc-script-transformer.js'
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
