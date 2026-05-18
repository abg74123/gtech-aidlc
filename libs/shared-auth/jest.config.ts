export default {
  displayName: 'shared-auth',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/shared-auth',
  moduleNameMapper: {
    '^@autoflow/shared-prisma$': '<rootDir>/../shared-prisma/src/index.ts',
    '^@autoflow/shared-types$': '<rootDir>/../shared-types/src/index.ts',
  },
};
