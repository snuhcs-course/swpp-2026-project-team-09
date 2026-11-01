/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { compareVersions, parseAppVersion, updateNeed } from '@/update/app-version';

const APK =
  'https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/snunow/app/26.10.28-1/snunow.apk';

describe('parseAppVersion', () => {
  it('reads the file the Release workflow writes', () => {
    expect(
      parseAppVersion({
        latest: '1.1.0',
        minimum: '1.0.0',
        fingerprint: { android: 'abc', ios: 'def' },
        download: { android: APK, ios: null },
      }),
    ).toEqual({ latest: '1.1.0', minimum: '1.0.0', download: { android: APK, ios: null } });
  });

  it('takes a missing minimum and missing downloads for none', () => {
    expect(parseAppVersion({ latest: '1.0.0' })).toEqual({
      latest: '1.0.0',
      minimum: null,
      download: { android: null, ios: null },
    });
  });

  it.each([
    ['nothing', null],
    ['a list', ['1.0.0']],
    ['a string', '1.0.0'],
    ['no latest', { minimum: '1.0.0' }],
    ['a latest that is a number', { latest: 1 }],
    ['a latest that is not x.y.z', { latest: '1.0' }],
    ['a minimum that is not x.y.z', { latest: '1.0.0', minimum: 'v1.0.0' }],
    ['downloads that are a list', { latest: '1.0.0', download: [APK] }],
    ['a download that is a number', { latest: '1.0.0', download: { android: 3, ios: null } }],
    ['an empty download', { latest: '1.0.0', download: { android: '', ios: null } }],
  ])('refuses a file with %s', (_, json) => {
    expect(parseAppVersion(json)).toBeNull();
  });
});

describe('compareVersions', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.0.1', '1.0.0', 1],
    ['1.0.0', '1.1.0', -1],
    ['2.0.0', '1.9.9', 1],
    // Each part is a number, not text: 1.10.0 is newer than 1.9.0.
    ['1.10.0', '1.9.0', 1],
  ])('compares %s with %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b) ?? Number.NaN)).toBe(sign);
  });

  it.each([
    ['', '1.0.0'],
    ['1.0', '1.0.0'],
    ['1.0.0', '1.0.0-beta'],
    ['a.b.c', '1.0.0'],
  ])('gives nothing for %s and %s', (a, b) => {
    expect(compareVersions(a, b)).toBeNull();
  });
});

describe('updateNeed', () => {
  it('tells nothing to the latest build', () => {
    expect(updateNeed('1.1.0', '1.1.0', '1.0.0')).toBe('none');
  });

  it('tells nothing to a build newer than the latest', () => {
    expect(updateNeed('1.2.0', '1.1.0', '1.0.0')).toBe('none');
  });

  it('recommends the latest to an older build at or above the minimum', () => {
    expect(updateNeed('1.0.0', '1.1.0', '1.0.0')).toBe('recommended');
    expect(updateNeed('1.0.5', '1.1.0', '1.0.0')).toBe('recommended');
  });

  it('requires the latest from a build below the minimum', () => {
    expect(updateNeed('1.0.0', '1.2.0', '1.1.0')).toBe('required');
  });

  it('takes a missing minimum for no minimum', () => {
    expect(updateNeed('1.0.0', '1.1.0', null)).toBe('recommended');
    expect(updateNeed('1.1.0', '1.1.0', null)).toBe('none');
  });

  it.each([
    ['an installed version', '', '1.1.0', '1.0.0'],
    ['an installed version', '1.0', '1.1.0', '1.0.0'],
    ['a latest', '1.0.0', 'latest', '1.0.0'],
    ['a minimum', '1.0.0', '1.1.0', '1'],
  ])('tells nothing when %s is not x.y.z', (_, installed, latest, minimum) => {
    expect(updateNeed(installed, latest, minimum)).toBe('none');
  });
});
