/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: test files in test/ and __tests__/ with no, one or two level suffixes, level suffixes outside them,
// names the package's runners do not run, .test and .spec names outside test folders, support files, the benchmark's
// eval/ and ignored folders. Expected results come from ADR 0007, the P09 spec and each package's runner config.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const script = join(import.meta.dirname, '..', 'check-test-levels.ts');
const aTest = "describe('rounds', () => {\n  it('places a request', () => {});\n});\n";

// What the four servers' Vitest runs.
const SERVER = ['test/**/*.unit.test.ts', 'test/**/*.integration.test.ts'];
const EVERY_LEVEL = ['{test,__tests__}/**/*.{unit,integration}.test.{ts,tsx}', '{test,__tests__}/**/*.e2e.test.ts'];

// Runs the check from a package folder holding the given files, told that the runners run the names `runs` matches.
function check(files: Record<string, string>, runs = EVERY_LEVEL) {
  const dir = mkdtempSync(join(tmpdir(), 'test-levels-'));
  try {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    const run = spawnSync(process.execPath, [script, ...runs], { cwd: dir, encoding: 'utf8' });
    return { status: run.status, output: run.stdout + run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a test file with one level suffix in test/ or __tests__/ → passes', () => {
  const run = check({
    'test/rounds.unit.test.ts': aTest,
    'test/rounds.integration.test.ts': aTest,
    'test/admin-ui/sign-in.e2e.test.ts': aTest,
    '__tests__/session.unit.test.tsx': aTest,
    '__tests__/site/health.integration.test.tsx': aTest,
  });
  assert.equal(run.status, 0, run.output);
});

test('a test file with no level suffix → fails, naming the file', () => {
  const run = check({ 'test/rounds.e2e-spec.ts': aTest });
  assert.equal(run.status, 1);
  assert.match(run.output, /test\/rounds\.e2e-spec\.ts/);
});

test('a test file with two level suffixes → fails, naming the file', () => {
  const run = check({ '__tests__/session.unit.integration.test.tsx': aTest });
  assert.equal(run.status, 1);
  assert.match(run.output, /__tests__\/session\.unit\.integration\.test\.tsx/);
});

test('a file with a level suffix outside test/ and __tests__/ → fails, naming the file', () => {
  const run = check({ 'src/matching/round.unit.test.ts': aTest });
  assert.equal(run.status, 1);
  assert.match(run.output, /src\/matching\/round\.unit\.test\.ts/);
});

test('every failing file → named', () => {
  const run = check({
    'test/rounds.e2e-spec.ts': aTest,
    '__tests__/events-test.tsx': aTest,
    'test/places.unit.test.ts': aTest,
  });
  assert.equal(run.status, 1);
  assert.match(run.output, /test\/rounds\.e2e-spec\.ts/);
  assert.match(run.output, /__tests__\/events-test\.tsx/);
  assert.doesNotMatch(run.output, /places\.unit\.test\.ts/);
});

for (const [name, path, runs] of [
  ['an e2e test in a server', 'test/parties.e2e.test.ts', SERVER],
  ['a .tsx test in a server', 'test/rounds.unit.test.tsx', SERVER],
  [
    "a .ts integration test beside admin's pages",
    '__tests__/csv.integration.test.ts',
    ['__tests__/**/*.unit.test.{ts,tsx}', '__tests__/*.integration.test.tsx', '__tests__/site/*.integration.test.ts'],
  ],
  ['a unit test in flow-tests', 'test/stack.unit.test.ts', ['test/**/*.e2e.test.ts', 'test/**/*.integration.test.ts']],
] as const) {
  test(`${name}, a name the package's runners do not run → fails, naming the file`, () => {
    const run = check({ [path]: aTest }, [...runs]);
    assert.equal(run.status, 1);
    assert.match(run.output, new RegExp(path.replaceAll('.', '\\.')));
  });
}

test("a server's unit and integration tests → pass", () => {
  const run = check({ 'test/rounds.unit.test.ts': aTest, 'test/places/coop.integration.test.ts': aTest }, SERVER);
  assert.equal(run.status, 0, run.output);
});

for (const path of ['src/round.test.ts', 'src/features/map.spec.tsx', 'app/page.test.js']) {
  test(`${path}, a .test or .spec name outside test/ and __tests__/ → fails, naming the file`, () => {
    const run = check({ [path]: aTest });
    assert.equal(run.status, 1);
    assert.match(run.output, new RegExp(path.replaceAll('.', '\\.')));
  });
}

test('no names of what the runners run → fails, saying how to run it', () => {
  const run = check({ 'test/rounds.unit.test.ts': aTest }, []);
  assert.equal(run.status, 2);
  assert.match(run.output, /check-test-levels\.ts <glob>/);
});

for (const declaration of [
  "it('places a request', () => {});",
  "test('places a request', () => {});",
  "describe.each([1, 2])('round %i', () => {});",
  "  it.each<[number]>([[1]])('round %i', () => {});",
  "it.each`\n  a | b\n`('adds', () => {});",
  "describe.skipIf(process.env.CI)('rounds', () => {});",
  "test.describe('sign-in', () => {});",
  "it.todo('places a request');",
]) {
  test(`a file in test/ declaring a test as ${JSON.stringify(declaration)} with no level suffix → fails`, () => {
    const run = check({ 'test/rounds.ts': `import { it } from 'vitest';\n\n${declaration}\n` });
    assert.equal(run.status, 1, run.output);
  });
}

test('support files that declare no test → pass without a level suffix', () => {
  const run = check({
    'test/start-app.ts': 'export const pattern = /x/;\nexport const matches = (name: string) => pattern.test(name);\n',
    '__tests__/support/app.tsx': '// Renders it (the whole app) once per test.\nexport function App() {}\n',
    'test/pages/coop-menus.html': "<script>\ntest('looks like a test');\n</script>\n",
    'test/answers/kakao-walk.json': '{ "it": "describe(" }\n',
    '__tests__/fixtures/timetable-ocr/README.md': "it('is not code');\n",
  });
  assert.equal(run.status, 0, run.output);
});

test("the benchmark's eval/ → not a test folder", () => {
  const run = check({ 'eval/run.eval.ts': aTest, 'eval/cases.ts': 'export const cases = [];\n' });
  assert.equal(run.status, 0, run.output);
});

test('node_modules and dot folders → not checked', () => {
  const run = check({
    'node_modules/zod/src/schema.unit.test.ts': aTest,
    '.next/server/page.unit.test.ts': aTest,
  });
  assert.equal(run.status, 0, run.output);
});
