/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { createVitest } from 'vitest/node';

// Runs a replay command's module. Node strips types but cannot run src/'s decorators or its imports written as .js,
// so the module goes through Vitest's module runner, which compiles them as it does for the tests. No test runs.

interface Command {
  main(argv: string[]): Promise<number>;
}

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// `module` is the command's path from main-server, such as ./eval/replay/replay.ts.
export async function launch(module: string, argv: string[]): Promise<number> {
  const vitest = await createVitest('test', { config: false, root: ROOT, watch: false });
  try {
    const command = await vitest.import<Command>(module);
    return await command.main(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  } finally {
    await vitest.close();
  }
}
