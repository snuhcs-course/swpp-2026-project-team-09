/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Where the latest native build is announced: `app-version.json` on the `app-version` Release, which the Release
// workflow replaces when it makes a native build.
export const APP_VERSION_URL =
  'https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/app-version/app-version.json';

// What the app reads of `app-version.json`. The file also holds the fingerprint, which only the workflow reads.
export interface AppVersion {
  // The latest native build's `version`, such as "1.0.0".
  latest: string;
  // The oldest native build that may still be used. null when the file has none.
  minimum: string | null;
  // Where each platform's latest build is downloaded. null where there is none to download, as on iOS today.
  download: { android: string | null; ios: string | null };
}

// What a phone is told at start: nothing, that a newer build is out, or that its build can no longer be used.
export type UpdateNeed = 'none' | 'recommended' | 'required';

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function link(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' && value !== '' ? value : undefined;
}

// The file's contents, or null when they are not a file the app can follow.
export function parseAppVersion(json: unknown): AppVersion | null {
  if (!isRecord(json) || typeof json.latest !== 'string' || !VERSION.test(json.latest)) {
    return null;
  }
  const minimum = json.minimum ?? null;
  if (minimum !== null && (typeof minimum !== 'string' || !VERSION.test(minimum))) {
    return null;
  }
  const download = json.download ?? {};
  if (!isRecord(download)) {
    return null;
  }
  const android = link(download.android);
  const ios = link(download.ios);
  if (android === undefined || ios === undefined) {
    return null;
  }
  return { latest: json.latest, minimum, download: { android, ios } };
}

// Negative when `a` is older than `b`, 0 when they are the same, positive when `a` is newer. null when either is not
// an x.y.z version.
export function compareVersions(a: string, b: string): number | null {
  const left = VERSION.exec(a);
  const right = VERSION.exec(b);
  if (left === null || right === null) {
    return null;
  }
  for (let part = 1; part <= 3; part += 1) {
    const difference = Number(left[part]) - Number(right[part]);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

// What the installed build is told, given the file's `latest` and `minimum`. A missing `minimum` is no minimum, and
// anything that is not an x.y.z version tells nothing.
export function updateNeed(installed: string, latest: string, minimum: string | null): UpdateNeed {
  const toLatest = compareVersions(installed, latest);
  if (toLatest === null) {
    return 'none';
  }
  if (minimum !== null) {
    const toMinimum = compareVersions(installed, minimum);
    if (toMinimum === null) {
      return 'none';
    }
    if (toMinimum < 0) {
      return 'required';
    }
  }
  return toLatest < 0 ? 'recommended' : 'none';
}
