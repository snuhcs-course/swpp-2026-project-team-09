import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { redisSettings, startRedis } from './containers.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts Redis once for every test file.
export default async function setup({ provide }: Readonly<Pick<TestProject, 'provide'>>): Promise<() => Promise<void>> {
  const redis = await startRedis();
  const settings: SettingValues = {
    PORT: '3002',
    ...redisSettings(redis),
  };
  provide('settings', settings);

  return async () => {
    await redis.stop();
  };
}
