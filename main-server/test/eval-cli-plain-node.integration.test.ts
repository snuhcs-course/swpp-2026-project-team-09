/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `pnpm eval` under plain Node (P13 ticket 04): the command line, and so eval/cases.ts and what it imports, loads
// without Vitest's resolver. #188's `import { type ClientCapability } from '../src/assistant/feature.js'` kept the
// import at run time, so `node eval/cli.ts` stopped with ERR_MODULE_NOT_FOUND before it printed anything; this test
// fails on it. It starts the command line without --yes, with stdin not a terminal and a dummy key, so it prints the
// estimate and stops before any run: no model, no database. A harness test, reported apart from the product's pyramid
// (ADR 0007).

const SERVER = fileURLToPath(new URL('..', import.meta.url));

describe('The command line under plain Node', () => {
  it('loads, prints the estimate and stops without --yes when stdin is not a terminal', () => {
    const envFile = join(mkdtempSync(join(tmpdir(), 'eval-cli-')), '.env');
    writeFileSync(envFile, 'OPENROUTER_API_KEY=dummy-key-for-the-test\nASSISTANT_MODEL=anthropic/claude-haiku-5.5\n');
    const { NODE_OPTIONS: _, ...env } = process.env;

    const { status, stdout, stderr } = spawnSync(process.execPath, ['eval/cli.ts', '--world', 'p6'], {
      cwd: SERVER,
      env: { ...env, EVAL_ENV_FILE: envFile },
      input: '',
      encoding: 'utf8',
      timeout: 50_000,
    });

    expect(stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(stdout).toMatch(/^Model .+/mu);
    expect(stdout).toMatch(/\d+ cases, \d+ turns/u);
    expect(stdout).toContain('Estimated cost USD');
    expect(stderr).toContain('Not a terminal: pass --yes to run without asking.');
    expect(stdout + stderr).not.toContain('dummy-key-for-the-test');
    expect(status).toBe(1);
  }, 60_000);
});
