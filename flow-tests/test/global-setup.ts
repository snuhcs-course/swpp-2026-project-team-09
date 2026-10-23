/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { rmSync } from 'node:fs';
import type { TestProject } from 'vitest/node';
import { writeSettings } from './settings.js';
import { FLOW_STACK, published, type Stack, startStack } from './stack.js';

declare module 'vitest' {
  export interface ProvidedContext {
    mainServer: string;
    socketServer: string;
    googlePrivateKey: string;
  }
}

// Builds and starts the stack, the flow stack unless another is given, and removes it with its volumes after the flows.
export default async function setup({ provide }: TestProject, stack: Stack = FLOW_STACK): Promise<() => Promise<void>> {
  rmSync(stack.settings, { recursive: true, force: true });
  const googlePrivateKey = writeSettings(stack.settings);
  const removeStack = await startStack(stack);
  provide('mainServer', await published(stack, 'main-server', 3000));
  provide('socketServer', await published(stack, 'socket-server', 3001));
  provide('googlePrivateKey', googlePrivateKey);
  return removeStack;
}
