export default {
  displayName: 'web',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/web',
  roots: ['<rootDir>'],
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'js', 'mts', 'mjs', 'html'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
};
