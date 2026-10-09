// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { execFileSync } from 'node:child_process';

import { BUILD_SETTINGS } from './site';

// Builds the site once before the tests that run it.
export default function build(): void {
  execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
    env: { ...process.env, ...BUILD_SETTINGS },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
