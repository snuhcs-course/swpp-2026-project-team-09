/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { rmSync } from 'node:fs';
import type { TestProject } from 'vitest/node';
import { writeSettings } from './settings.js';
import { FLOW_STACK, published, startStack } from './stack.js';

declare module 'vitest' {
  export interface ProvidedContext {
    mainServer: string;
    socketServer: string;
    googlePrivateKey: string;
  }
}

// Builds and starts the stack, and removes it with its volumes after the flows.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  rmSync(FLOW_STACK.settings, { recursive: true, force: true });
  const googlePrivateKey = writeSettings(FLOW_STACK.settings);
  const removeStack = await startStack(FLOW_STACK);
  provide('mainServer', await published(FLOW_STACK, 'main-server', 3000));
  provide('socketServer', await published(FLOW_STACK, 'socket-server', 3001));
  provide('googlePrivateKey', googlePrivateKey);
  return removeStack;
}
