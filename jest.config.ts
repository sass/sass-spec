import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['test'],
  setupFilesAfterEnv: ['jest-extended'],
};

export default config;
