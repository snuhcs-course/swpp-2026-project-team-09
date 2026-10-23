/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Sums a coverage report over each file set of the P09 spec's "Coverage goals", for the package in the current folder.
// Run from a package folder after `pnpm test:cov:unit` or `pnpm test:cov`:
// node ../scripts/coverage-by-file-set.ts coverage/coverage-summary.json

import { readFileSync } from 'node:fs';
import { basename, matchesGlob, relative } from 'node:path';

const METRICS = ['statements', 'branches', 'functions', 'lines'] as const;
type Metric = (typeof METRICS)[number];
type Counts = Record<Metric, { covered: number; total: number }>;

// A file is in a set when it matches `include` and not `exclude`, or matches `add`.
interface FileSet {
  name: string;
  include: string[];
  exclude?: string[];
  add?: string[];
}

const KINDS = '{service,controller,gateway,collector,guard}';
const ENTRY: Record<string, string> = {
  'main-server': 'src/{main,seed,demo-seed,demo-walk,load-seed}.ts',
  'match-server': 'src/main.ts',
  'socket-server': 'src/main.ts',
  'worker-server': 'src/{main,collect,collect-sources,demo-menus}.ts',
};
// match-server's round split and `assign` are pure functions in service files.
const LOGIC_IN_SERVICES: Record<string, string[]> = {
  'match-server': ['src/matching/{round,placement}.service.ts'],
};

function serverSets(pkg: string): FileSet[] {
  return [
    { name: pkg, include: ['src/**'] },
    { name: 'services, controllers, gateways, collectors and guards', include: [`src/**/*.${KINDS}.ts`] },
    // Controllers' branch figure is not targeted.
    { name: 'services, gateways, collectors and guards', include: ['src/**/*.{service,gateway,collector,guard}.ts'] },
    { name: 'entry points, seeds and command-line scripts', include: [ENTRY[pkg]] },
    {
      name: 'logic',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.{controller,service,gateway,module,collector,guard,interceptor,filter}.ts',
        ENTRY[pkg],
        '**/*.seed.ts',
        'src/demo/**',
        'src/generated/**',
      ],
      add: LOGIC_IN_SERVICES[pkg] ?? [],
    },
  ];
}

const SETS: Record<string, FileSet[]> = {
  ...Object.fromEntries(Object.keys(ENTRY).map((pkg) => [pkg, serverSets(pkg)])),
  admin: [
    { name: 'admin', include: ['src/**'] },
    { name: 'modules', include: ['src/**'], exclude: ['**/page.tsx', '**/layout.tsx', '**/route.ts'] },
  ],
  mobile: [
    { name: 'mobile', include: ['src/**'] },
    { name: 'logic (src/api, src/features)', include: ['src/{api,features}/**'] },
    { name: 'UI (src/screens, src/design-system)', include: ['src/{screens,design-system}/**'] },
    { name: 'I/O wrappers (src/position, src/live)', include: ['src/{position,live}/**'] },
    { name: 'in-app mock (src/api/mock)', include: ['src/api/mock/**'] },
    { name: 'route files (src/app)', include: ['src/app/**'] },
    { name: 'catalogue (src/catalogue)', include: ['src/catalogue/**'] },
    {
      name: 'logic (src/features, src/auth, src/session, src/storage, src/hooks)',
      include: ['src/{features,auth,session,storage,hooks}/**'],
    },
    { name: 'API client (src/api without src/api/mock)', include: ['src/api/**'], exclude: ['src/api/mock/**'] },
    { name: 'design-system and map (src/design-system, src/map)', include: ['src/{design-system,map}/**'] },
  ],
};

const pkg = basename(process.cwd());
const reportPath = process.argv[2];
if (reportPath === undefined || !(pkg in SETS)) {
  console.error(
    `Usage, from the folder of ${Object.keys(SETS).join(', ')}: node ../scripts/coverage-by-file-set.ts <coverage-summary.json>`,
  );
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Record<string, Counts>;
const { total, ...byPath } = report;
const files = Object.entries(byPath).map(([path, counts]) => ({ path: relative(process.cwd(), path), counts }));

const matchesAny = (path: string, globs: string[] = []) => globs.some((glob) => matchesGlob(path, glob));
const inSet = (path: string, set: FileSet) =>
  (matchesAny(path, set.include) && !matchesAny(path, set.exclude)) || matchesAny(path, set.add);

function sum(paths: Set<string>): Record<Metric, [covered: number, total: number]> {
  const chosen = files.filter(({ path }) => paths.has(path));
  return Object.fromEntries(
    METRICS.map((m) => [
      m,
      [
        chosen.reduce((n, { counts }) => n + counts[m].covered, 0),
        chosen.reduce((n, { counts }) => n + counts[m].total, 0),
      ],
    ]),
  ) as Record<Metric, [number, number]>;
}

// Floored to two decimals, as the coverage tools round.
const percent = ([covered, all]: [number, number]) =>
  all === 0 ? `– (0/0)` : `${(Math.floor((covered * 10000) / all) / 100).toFixed(2)} % (${covered}/${all})`;

const whole = sum(new Set(files.filter(({ path }) => matchesGlob(path, 'src/**')).map(({ path }) => path)));
const mismatch = METRICS.filter((m) => whole[m][0] !== total[m].covered || whole[m][1] !== total[m].total);
if (mismatch.length > 0) {
  console.error(
    `The files under src/ do not add up to the report's total (${mismatch.join(', ')}): run this from the folder of the package whose checkout wrote the report.`,
  );
  process.exit(1);
}

console.log('| File set | Files | Statements | Branches | Functions | Lines |');
console.log('|---|---|---|---|---|---|');
for (const set of SETS[pkg]) {
  const paths = new Set(files.filter(({ path }) => inSet(path, set)).map(({ path }) => path));
  const counts = sum(paths);
  console.log(`| ${set.name} | ${paths.size} | ${METRICS.map((m) => percent(counts[m])).join(' | ')} |`);
}
