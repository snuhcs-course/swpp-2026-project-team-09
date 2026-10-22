/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Checks that the test files of the package in the current folder are named by level (ADR 0007).
// Run from a package folder: node ../scripts/check-test-levels.ts

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, sep } from 'node:path';

const TEST_FOLDERS = new Set(['test', '__tests__']);
const LEVELS = new Set(['unit', 'integration', 'e2e']);
const LEVEL_SUFFIX = /\.(unit\.test\.tsx?|integration\.test\.tsx?|e2e\.test\.ts)$/;
const CODE = /\.[cm]?[jt]sx?$/;
// A line that starts with a call of describe, it or test, including forms such as it.each`…` and describe.skipIf(…)(…).
const DECLARES_A_TEST = /^\s*(describe|it|test)(\.\w+)*\s*[(`<]/m;

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

function problem(path: string): string | undefined {
  const name = basename(path);
  const hasSuffix = LEVEL_SUFFIX.test(name);
  if (!TEST_FOLDERS.has(path.split(sep)[0])) {
    return hasSuffix ? 'has a level suffix but is outside test/ and __tests__/' : undefined;
  }
  if (name.split('.').filter((part, i) => i > 0 && LEVELS.has(part)).length > 1) {
    return 'has more than one level suffix';
  }
  if (!hasSuffix && CODE.test(name) && DECLARES_A_TEST.test(readFileSync(path, 'utf8'))) {
    return 'declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts';
  }
  return undefined;
}

const all = [...files('.')].sort();
const failures = all.flatMap((path) => {
  const found = problem(path);
  return found ? [`${path}: ${found}`] : [];
});

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`${failures.length} file(s) not named by test level (ADR 0007).`);
  process.exitCode = 1;
} else {
  const named = all.filter((path) => TEST_FOLDERS.has(path.split(sep)[0]) && LEVEL_SUFFIX.test(path)).length;
  console.log(`${named} test file(s), each named by its test level.`);
}
