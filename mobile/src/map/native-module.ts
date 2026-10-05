import { requireOptionalNativeModule } from 'expo';

// The name the native map module registers under. Ticket 07 writes its Android side, ticket 11 its iOS side.
export const NATIVE_MAP_MODULE = 'SnuNowMap';

// Whether this build holds the native map module. Expo Go, the web and the tests do not.
export function hasNativeMap(): boolean {
  return requireOptionalNativeModule(NATIVE_MAP_MODULE) !== null;
}
