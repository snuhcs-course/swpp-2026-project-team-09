/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';
import setUpTheFlowStack from '../global-setup.js';
import { FLOW_STACK, published, type Stack } from '../stack.js';

declare module 'vitest' {
  export interface ProvidedContext {
    adminSite: string;
    adminUiFailures: string;
  }
}

// The flow stack with the admin site over it, under the flow stack's project name.
const WITH_THE_ADMIN_SITE: Stack = {
  ...FLOW_STACK,
  files: [...FLOW_STACK.files, 'flow-tests/compose.admin-ui.test.yaml'],
};

// The failed tests' screenshots and traces, beside vitest.config.ts's JUnit report. The reporter has its file open
// already, so only this folder is emptied of an earlier run's.
const FAILURES = fileURLToPath(new URL('../../admin-ui-results/failures/', import.meta.url));

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  rmSync(FAILURES, { recursive: true, force: true });
  const removeStack = await setUpTheFlowStack(project, WITH_THE_ADMIN_SITE);
  // On localhost, which Chromium counts as secure, so that it keeps the site's Secure cookies over plain HTTP.
  const { port } = new URL(await published(WITH_THE_ADMIN_SITE, 'admin', 3100));
  project.provide('adminSite', `http://localhost:${port}`);
  project.provide('adminUiFailures', FAILURES);
  return removeStack;
}
