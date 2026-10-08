import { use } from 'react';
import { type EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';

const NONE: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// The phone's status bar and own bar, which a component keeps clear of. Without a provider of them, as in a test or
// the catalogue's checks, there are none.
export function useInsets(): EdgeInsets {
  return use(SafeAreaInsetsContext) ?? NONE;
}
