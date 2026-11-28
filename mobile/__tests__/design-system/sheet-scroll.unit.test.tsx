/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A sheet's body takes a pull down (P06 ticket 53), which on Android takes the finger from a plain ScrollView inside
// it. So content that scrolls in a sheet scrolls in a `SheetScroll`, which shares the finger with the pull, and a sheet
// whose wheels must keep the finger says `pullBody={false}`. This reads the app's source and fails on a file that
// draws a sheet and a plain ScrollView without it.

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
const { join, relative } = jest.requireActual<{
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
}>('node:path');

// oxlint-disable-next-line no-underscore-dangle -- as above
const SOURCE = join(__dirname, '..', '..', 'src');

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('the sheets of the app', () => {
  it('scroll their content in a SheetScroll, or take no pull on their body', () => {
    const sheets = sourceFiles(SOURCE)
      .map((path) => ({ path: relative(SOURCE, path), source: readFileSync(path, 'utf8') }))
      .filter(({ source }) => /<BottomSheet[\s>]/u.test(source));
    const plainScroll = sheets
      .filter(({ source }) => /<ScrollView[\s>]/u.test(source) && !source.includes('pullBody={false}'))
      .map(({ path }) => path);

    expect(sheets.length).toBeGreaterThan(10);
    expect(plainScroll).toEqual([]);
  });

  // The user (2026-11-28): "어떤 부분은 타이틀 밑에 가로줄이 들어가고 어떤 데는 가로 작대기 바로 밑에 들어가고." Every
  // sheet reads grip, title, rule, content: its title is its head. Only a sheet with no title has no head, and so no rule.
  it('give their title to the sheet as its head, but the two that have none', () => {
    const headless = sourceFiles(SOURCE)
      .map((path) => ({ path: relative(SOURCE, path), source: readFileSync(path, 'utf8') }))
      .filter(({ source }) => /<BottomSheet[\s>]/u.test(source) && !/<BottomSheet[^>]*\shead=\{/su.test(source))
      .map(({ path }) => path);

    expect(headless).toEqual(['catalogue/screens.tsx', 'screens/me/week-card.tsx']);
  });
});
