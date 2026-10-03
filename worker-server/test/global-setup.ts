import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// The settings of every test file. No test calls the main server: test/main-server.ts stands for it.
export default function setup({ provide }: TestProject): void {
  provide('settings', {
    PORT: '3002',
    MAIN_SERVER_URL: 'http://main-server.test:3000',
    // Not a secret: the stand-in for the main server keeps the token of each message.
    WORKER_TOKEN: 'test-worker-token-of-thirty-two-characters',
  });
}
