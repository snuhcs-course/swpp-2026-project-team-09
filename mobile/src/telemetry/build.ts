/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

// What the build is, as both the crash reports' tags and every usage event carry it: the Release the JavaScript came
// from, the over-the-air update and the runtime version it runs on, the native build's version and the platform.

function tag(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? 'none' : trimmed;
}

export interface BuildTags {
  release_tag: string;
  release_commit: string;
  ota_update_id: string;
  runtime_version: string;
  app_version: string;
  platform: string;
}

// Each variable is read by its full name, because the bundler replaces only those.
export function buildTags(): BuildTags {
  return {
    release_tag: tag(process.env.EXPO_PUBLIC_RELEASE_TAG),
    release_commit: tag(process.env.EXPO_PUBLIC_RELEASE_COMMIT),
    ota_update_id: tag(Updates.updateId),
    runtime_version: tag(Updates.runtimeVersion),
    app_version: tag(Constants.expoConfig?.version),
    platform: Platform.OS,
  };
}
