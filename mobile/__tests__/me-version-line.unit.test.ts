/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-27  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { versionLine } from '@/screens/me/version-line';

const COMMIT = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';

// A native build's embedded JavaScript and an update downloaded later both carry the tag and commit they were
// bundled with, so the line reads them the same way; the two cases differ only in the values.
describe('versionLine', () => {
  it('gives the JavaScript embedded in a native build its Release tag and short commit', () => {
    expect(versionLine({ version: '1.0.0', tag: 'snunow/app/26.10.27-1', commit: COMMIT, dev: false })).toBe(
      '앱 1.0.0 · 업데이트 snunow/app/26.10.27-1 (1a2b3c4)',
    );
  });

  it('gives an update its own tag, on the same native version', () => {
    expect(versionLine({ version: '1.0.0', tag: 'snunow/all/26.10.30-1', commit: COMMIT, dev: false })).toBe(
      '앱 1.0.0 · 업데이트 snunow/all/26.10.30-1 (1a2b3c4)',
    );
  });

  it('leaves the commit out when it is missing', () => {
    expect(versionLine({ version: '1.0.0', tag: 'snunow/all/26.10.28-2', commit: '', dev: false })).toBe(
      '앱 1.0.0 · 업데이트 snunow/all/26.10.28-2',
    );
  });

  it('calls a development build 개발 빌드, whatever its tag', () => {
    expect(versionLine({ version: '1.0.0', tag: 'snunow/app/26.10.27-1', commit: COMMIT, dev: true })).toBe(
      '앱 1.0.0 · 개발 빌드',
    );
  });

  it('calls a build without a tag 개발 빌드', () => {
    expect(versionLine({ version: '1.0.0', tag: '', commit: COMMIT, dev: false })).toBe('앱 1.0.0 · 개발 빌드');
  });
});
