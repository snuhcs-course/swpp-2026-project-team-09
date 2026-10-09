/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-05  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { requireOptionalNativeModule } from 'expo';

// The name the native map module registers under: `modules/snu-now-map`, Android in ticket 07 and iOS in ticket 11.
export const NATIVE_MAP_MODULE = 'SnuNowMap';

// Whether this build holds the native map module. Expo Go, the web and the tests do not.
export function hasNativeMap(): boolean {
  return requireOptionalNativeModule(NATIVE_MAP_MODULE) !== null;
}
