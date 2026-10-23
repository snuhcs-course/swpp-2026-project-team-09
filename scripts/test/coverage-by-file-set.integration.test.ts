/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a file of each kind the P09 spec's file sets name, in a server, admin and mobile; sums over several files;
// a figure that does not divide evenly and one with nothing to count; a report that is not the package's; no report.
// Expected values come from the P09 spec's "Coverage goals", worked by hand.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const script = join(import.meta.dirname, '..', 'coverage-by-file-set.ts');
const METRICS = ['statements', 'branches', 'functions', 'lines'] as const;

type Counts = Record<(typeof METRICS)[number], [covered: number, total: number]>;
const same = (covered: number, total: number): Counts => ({
  statements: [covered, total],
  branches: [covered, total],
  functions: [covered, total],
  lines: [covered, total],
});

// Writes a coverage-summary.json for `files` (paths in the package) into a package folder named `pkg`, the way
// Vitest's and Jest's json-summary reporters do, with absolute paths and the total; then runs the script from there.
function run(pkg: string, files: Record<string, Counts>, total?: Counts) {
  // The real path, as the reporters write it: macOS's temporary folder is behind a symbolic link.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coverage-sets-')));
  const dir = join(root, pkg);
  try {
    mkdirSync(join(dir, 'coverage'), { recursive: true });
    const summed = Object.fromEntries(
      METRICS.map((m) => [m, Object.values(files).reduce((sum, counts) => sum + counts[m][1], 0)]),
    );
    const covered = Object.fromEntries(
      METRICS.map((m) => [m, Object.values(files).reduce((sum, counts) => sum + counts[m][0], 0)]),
    );
    const entry = (counts: Counts) =>
      Object.fromEntries(METRICS.map((m) => [m, { covered: counts[m][0], total: counts[m][1], skipped: 0, pct: 0 }]));
    const report = {
      total: entry(total ?? (Object.fromEntries(METRICS.map((m) => [m, [covered[m], summed[m]]])) as Counts)),
      ...Object.fromEntries(Object.entries(files).map(([path, counts]) => [join(dir, path), entry(counts)])),
    };
    writeFileSync(join(dir, 'coverage', 'coverage-summary.json'), JSON.stringify(report));
    const result = spawnSync(process.execPath, [script, 'coverage/coverage-summary.json'], {
      cwd: dir,
      encoding: 'utf8',
    });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The cells of the output's table row whose first cell is `name`.
function row(output: string, name: string): string[] {
  const line = output.split('\n').find((one) => one.startsWith(`| ${name} |`));
  assert.ok(line, `no row "${name}" in:\n${output}`);
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

test("a server's files → each in the spec's sets of its kind, the round split's service among the logic", () => {
  const { status, output } = run('match-server', {
    'src/main.ts': same(0, 4),
    'src/matching/round.service.ts': same(6, 8),
    'src/matching/matching.module.ts': same(1, 1),
    'src/matching/rounds.controller.ts': same(1, 2),
    'src/common/settings.ts': same(3, 3),
  });
  assert.equal(status, 0, output);
  assert.deepEqual(row(output, 'match-server').slice(1), [
    '5',
    '61.11 % (11/18)',
    '61.11 % (11/18)',
    '61.11 % (11/18)',
    '61.11 % (11/18)',
  ]);
  assert.equal(row(output, 'services, controllers, gateways, collectors and guards')[1], '2');
  assert.equal(row(output, 'services, controllers, gateways, collectors and guards')[3], '70.00 % (7/10)');
  assert.equal(row(output, 'services, gateways, collectors and guards')[3], '75.00 % (6/8)');
  assert.equal(row(output, 'entry points, seeds and command-line scripts')[5], '0.00 % (0/4)');
  assert.deepEqual(row(output, 'logic').slice(1, 3), ['2', '81.81 % (9/11)']);
});

test("main-server's entry files and seeds → out of its logic", () => {
  const { output } = run('main-server', {
    'src/demo-walk.ts': same(0, 5),
    'src/places/places.seed.ts': same(0, 5),
    'src/demo/campus.ts': same(0, 5),
    'src/generated/prisma/client.ts': same(0, 5),
    'src/common/geometry.ts': same(4, 5),
  });
  assert.equal(row(output, 'entry points, seeds and command-line scripts')[1], '1');
  assert.deepEqual(row(output, 'logic').slice(1, 3), ['1', '80.00 % (4/5)']);
});

test("admin's route entry files → out of its modules; a module beside them under src/app/ → in", () => {
  const { output } = run('admin', {
    'src/app/(signed-in)/events/page.tsx': same(1, 4),
    'src/app/(signed-in)/layout.tsx': same(1, 4),
    'src/app/health/live/route.ts': same(1, 4),
    'src/app/health/health-answer.ts': same(4, 4),
    'src/app/sign-in/actions.ts': same(0, 4),
    'src/main-server.ts': same(3, 4),
  });
  assert.deepEqual(row(output, 'admin').slice(1, 3), ['6', '41.66 % (10/24)']);
  assert.deepEqual(row(output, 'modules').slice(1, 3), ['3', '58.33 % (7/12)']);
});

test("mobile's folders → the goals' sets and the unit-only ones, the in-app mock outside the API client", () => {
  const { output } = run('mobile', {
    'src/api/server/answers.ts': same(9, 10),
    'src/api/mock/data.ts': same(1, 10),
    'src/features/map/adapter.ts': same(8, 10),
    'src/screens/map/main-screen.tsx': same(5, 10),
    'src/design-system/badge.tsx': same(10, 10),
    'src/position/watch.ts': same(2, 10),
    'src/app/index.tsx': same(0, 10),
    'src/session/session.ts': same(7, 10),
  });
  const statements = (name: string) => row(output, name)[2];
  assert.equal(statements('logic (src/api, src/features)'), '60.00 % (18/30)');
  assert.equal(statements('UI (src/screens, src/design-system)'), '75.00 % (15/20)');
  assert.equal(statements('I/O wrappers (src/position, src/live)'), '20.00 % (2/10)');
  assert.equal(statements('in-app mock (src/api/mock)'), '10.00 % (1/10)');
  assert.equal(statements('route files (src/app)'), '0.00 % (0/10)');
  assert.equal(statements('logic (src/features, src/auth, src/session, src/storage, src/hooks)'), '75.00 % (15/20)');
  assert.equal(statements('API client (src/api without src/api/mock)'), '90.00 % (9/10)');
  assert.equal(statements('design-system and map (src/design-system, src/map)'), '100.00 % (10/10)');
  assert.equal(statements('mobile'), '52.50 % (42/80)');
});

test('each metric → summed on its own', () => {
  const { output } = run('socket-server', {
    'src/users/access-token.ts': { statements: [9, 10], branches: [3, 4], functions: [2, 2], lines: [8, 9] },
  });
  assert.deepEqual(row(output, 'logic').slice(2), [
    '90.00 % (9/10)',
    '75.00 % (3/4)',
    '100.00 % (2/2)',
    '88.88 % (8/9)',
  ]);
});

test('a set with nothing to count → no figure, and a set with no file → 0 files', () => {
  const { output } = run('worker-server', { 'src/sources/coop.parser.ts': { ...same(3, 3), branches: [0, 0] } });
  assert.equal(row(output, 'logic')[3], '– (0/0)');
  assert.deepEqual(row(output, 'services, controllers, gateways, collectors and guards').slice(1, 3), ['0', '– (0/0)']);
});

test("a report whose files do not add up to its total, such as another checkout's → fails, saying so", () => {
  const { status, output } = run('match-server', { 'src/main.ts': same(1, 2) }, same(5, 10));
  assert.equal(status, 1);
  assert.match(output, /do not add up to the report's total/);
});

test('a folder that is not a package with file sets → fails, saying how to run it', () => {
  const { status, output } = run('flow-tests', { 'src/main.ts': same(1, 2) });
  assert.equal(status, 2);
  assert.match(output, /coverage-by-file-set\.ts <coverage-summary\.json>/);
});
