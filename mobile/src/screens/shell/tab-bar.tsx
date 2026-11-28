/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactElement } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavItem, color, shadow } from '@/design-system';
import { useBellCount, usePartyBadge } from '@/features/notifications/use-notices';
import { useAiRaised } from './ai-raised';
import { navPaddingBottom } from './layout';
import { useTabBarHiddenOnMain } from './main-tab-bar';

// The bar's five slots and the tab each opens (A04 ticket 09): 파티, 행사, the map and the AI in the middle, 오늘 (A04
// ticket 10) and 내 정보. The middle is the map's tab, round, and its name stays "지도".
const SLOTS = [
  { route: 'party', icon: 'users', label: '파티' },
  { route: 'events', icon: 'calendar', label: '행사' },
  { route: 'main', icon: 'mapSpark', label: '지도' },
  { route: 'today', icon: 'today', label: '오늘' },
  { route: 'me', icon: 'user', label: '내 정보' },
] as const;

type Route = (typeof SLOTS)[number]['route'];

interface Counts {
  party: number;
  bell: number;
}

// 파티 counts the rows of 알림 that wait and concern 파티; 오늘 counts what 내 정보's bell counted, the rows that wait
// and the kept Notifications unread.
function itemsWith(counts: Counts, raised: boolean): BottomNavItem[] {
  return SLOTS.map(({ route, icon, label }): BottomNavItem => {
    if (route === 'main') {
      return { icon, label, round: true, raised };
    }
    const badges: Partial<Record<Route, number>> = { party: counts.party, today: counts.bell };
    return { icon, label, badge: badges[route] };
  });
}

// The tabs' bottom navigation, as the frames draw it: no line on top but a soft shadow, and 16 under the items, or
// the phone's own bar where that is higher. A slot shows its tab. The middle on the map raises or lowers the AI, and on
// another tab shows the map with the AI raised. Each tab tells the toast where to sit while it is in front. It gives
// way to the answer frame on the map, so that the AI is neither raised nor lowered there.
export function TabBar({ state, navigation }: BottomTabBarProps): ReactElement | null {
  const counts = { party: usePartyBadge(), bell: useBellCount() };
  const { raised, setRaised } = useAiRaised();
  const { bottom } = useSafeAreaInsets();
  const hiddenOnMain = useTabBarHiddenOnMain();
  const current = state.routes[state.index]?.name;
  if (hiddenOnMain && current === 'main') {
    return null;
  }
  return (
    <View style={[styles.bar, { paddingBottom: navPaddingBottom(bottom) }]}>
      <BottomNav
        active={SLOTS.findIndex(({ route }) => route === current)}
        items={itemsWith(counts, raised)}
        line={false}
        onSelect={(index) => {
          const route = SLOTS[index]?.route;
          if (route === undefined) {
            return;
          }
          if (route === 'main') {
            // The keyboard goes down with the input it was up for.
            Keyboard.dismiss();
            setRaised(current === 'main' ? !raised : true);
          }
          if (route !== current) {
            navigation.navigate(route);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.surface, boxShadow: shadow.nav },
});
