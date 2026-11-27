import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  // Work around facebook/jest#2549. We have to use the child-process runner
  // because the default worker runner doesn't support `process.chdir()`.
  testEnvironment: 'jest-light-runner/child-process',
  roots: ['test'],
  setupFilesAfterEnv: ['jest-extended/all'],
};

export default config;
