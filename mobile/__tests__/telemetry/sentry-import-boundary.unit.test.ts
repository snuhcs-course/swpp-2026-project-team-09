/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Only `src/telemetry/` imports the Sentry SDK, so that every report passes its scrubbing. This reads the app's source
// tree and fails on an import anywhere else.

// The app's types have no Node.js: what this test uses of it, typed here.
// oxlint-disable-next-line no-underscore-dangle -- Jest gives each test file its own folder by this name
declare const __dirname: string;
interface Entry {
  name: string;
  isDirectory: () => boolean;
}
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
}>('node:fs');
const { join, relative, sep } = jest.requireActual<{
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
  sep: string;
}>('node:path');

// oxlint-disable-next-line no-underscore-dangle -- as above
const MOBILE = join(__dirname, '..', '..');
const TELEMETRY = `src${sep}telemetry${sep}`;
// `from '@sentry/react-native'` or a subpath of it, a bare `import`, `require(…)` and `import(…)`.
const IMPORTS_SENTRY =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]@sentry\/react-native(?:\/[^'"]*)?['"]/u;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    if (entry.isDirectory()) {
      yield* sourceFiles(path);
    } else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) {
      yield path;
    }
  }
}

function offenders(): string[] {
  const roots = [join(MOBILE, 'src'), join(MOBILE, 'modules')];
  const files = [...roots.flatMap((root) => Array.from(sourceFiles(root))), join(MOBILE, 'index.ts')];
  return files
    .map((file) => relative(MOBILE, file))
    .filter((file) => !file.startsWith(TELEMETRY))
    .filter((file) => IMPORTS_SENTRY.test(readFileSync(join(MOBILE, file), 'utf8')));
}

describe('the Sentry SDK', () => {
  it('is imported only in src/telemetry/', () => {
    expect(offenders()).toEqual([]);
  });

  it('is imported in src/telemetry/, which the search reaches', () => {
    const layer = readFileSync(join(MOBILE, 'src', 'telemetry', 'sentry.ts'), 'utf8');
    expect(IMPORTS_SENTRY.test(layer)).toBe(true);
  });
});

describe('the search', () => {
  it.each([
    "import * as Sentry from '@sentry/react-native';",
    "import { captureException } from '@sentry/react-native';",
    'import type { Breadcrumb } from "@sentry/react-native";',
    "const Sentry = require('@sentry/react-native');",
    "const metro = require('@sentry/react-native/metro');",
    "void import('@sentry/react-native');",
    "import '@sentry/react-native';",
  ])('finds %s', (line) => {
    expect(IMPORTS_SENTRY.test(line)).toBe(true);
  });

  it('does not take a mention in a comment for an import', () => {
    expect(IMPORTS_SENTRY.test('// Only src/telemetry/ imports @sentry/react-native.')).toBe(false);
  });
});
