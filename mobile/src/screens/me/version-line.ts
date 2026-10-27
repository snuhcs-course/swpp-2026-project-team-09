/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import Constants from 'expo-constants';

// What a phone runs, for the line at the bottom of 내 정보.
export interface Build {
  // The native build's `version` in `app.json`, such as "1.0.0".
  version: string;
  // The Release tag the JavaScript was published or built from, such as "snunow/app/26.10.27-1". "" when unset.
  tag: string;
  // That tag's commit. "" when unset.
  commit: string;
  // A development build, which runs the JavaScript from the computer.
  dev: boolean;
}

// "앱 1.0.0 · 업데이트 snunow/app/26.10.27-1 (1a2b3c4)", or "앱 1.0.0 · 개발 빌드" for a development build and for
// a build made without a Release tag.
export function versionLine({ version, tag, commit, dev }: Build): string {
  const app = `앱 ${version}`;
  if (dev || tag === '') {
    return `${app} · 개발 빌드`;
  }
  const short = commit.slice(0, 7);
  return short === '' ? `${app} · 업데이트 ${tag}` : `${app} · 업데이트 ${tag} (${short})`;
}

// This build's line. The tag and commit are baked into the JavaScript when a Release publishes it or a native build
// is made; each variable is read by its full name, because the bundler replaces only those.
export function thisVersionLine(): string {
  return versionLine({
    version: Constants.expoConfig?.version ?? '',
    tag: (process.env.EXPO_PUBLIC_RELEASE_TAG ?? '').trim(),
    commit: (process.env.EXPO_PUBLIC_RELEASE_COMMIT ?? '').trim(),
    dev: __DEV__,
  });
}
