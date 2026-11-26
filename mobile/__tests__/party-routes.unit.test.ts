/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// 전체 파티 and its boards left the app with P06 ticket 12, 찾기's filters taking their place: no route under
// `src/app/` answers `/boards` or `/boards/<board>`. This reads the app's route folder.

// The app's types have no Node.js: what this test uses of it, typed here.
// oxlint-disable-next-line no-underscore-dangle -- Jest gives each test file its own folder by this name
declare const __dirname: string;
const { existsSync } = jest.requireActual<{ existsSync: (path: string) => boolean }>('node:fs');
const { join } = jest.requireActual<{ join: (...parts: string[]) => string }>('node:path');

// oxlint-disable-next-line no-underscore-dangle -- as above
const SIGNED_IN = join(__dirname, '..', 'src', 'app', '(signed-in)');

describe('the routes above the tabs', () => {
  it('have no 전체 파티 and no board, and keep 파티 모집글', () => {
    expect(existsSync(join(SIGNED_IN, 'boards'))).toBe(false);
    expect(existsSync(join(SIGNED_IN, 'post', '[questId].tsx'))).toBe(true);
  });
});
