import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  // Work around facebook/jest#2549
  testEnvironment: 'jest-environment-node-single-context',
  roots: ['test'],
  setupFilesAfterEnv: ['jest-extended/all'],
};

export default config;
