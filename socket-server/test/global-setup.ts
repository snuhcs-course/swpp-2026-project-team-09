import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { redisSettings, startRedis } from './containers.js';
import { es256KeyPair } from './keys.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
    // Stands in for the main server's private key: the tests sign access tokens with it.
    accessTokenPrivateKey: string;
  }
}

// Starts Redis once for every test file and makes the access token key pair for the run.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const redis = await startRedis();
  const accessTokenKeys = es256KeyPair();
  const settings: SettingValues = {
    PORT: '3001',
    ...redisSettings(redis),
    ACCESS_TOKEN_PUBLIC_KEY: accessTokenKeys.publicKey,
  };
  provide('settings', settings);
  provide('accessTokenPrivateKey', accessTokenKeys.privateKey);

  return async () => {
    await redis.stop();
  };
}
