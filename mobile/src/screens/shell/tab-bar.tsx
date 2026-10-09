// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavItem, color, shadow, useNotReadyToast } from '@/design-system';
import { usePartyBadge } from '@/features/notifications/use-notices';
import { navPaddingBottom } from './layout';

// The frames' five slots and the tab each opens. 올리기 is the action in the middle and opens no tab.
const SLOTS = [
  { route: 'main', icon: 'map', label: '지도' },
  { route: 'party', icon: 'users', label: '파티' },
  { route: null, icon: 'plus', label: '올리기' },
  { route: 'events', icon: 'calendar', label: '행사' },
  { route: 'me', icon: 'user', label: '내 정보' },
] as const;

function itemsWith(partyBadge: number): BottomNavItem[] {
  return SLOTS.map(({ route, icon, label }) =>
    route === null ? { icon, label, action: true } : { icon, label, badge: route === 'party' ? partyBadge : undefined },
  );
}

// The tabs' bottom navigation, as the frames draw it: no line on top but a soft shadow, and 16 under the items, or
// the phone's own bar where that is higher. A slot shows its tab; 올리기 belongs to another task and says that it is
// not ready. Each tab tells the toast where to sit while it is in front.
export function TabBar({ state, navigation }: BottomTabBarProps): ReactElement {
  const partyBadge = usePartyBadge();
  const showNotReady = useNotReadyToast();
  const { bottom } = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View style={[styles.bar, { paddingBottom: navPaddingBottom(bottom) }]}>
      <BottomNav
        active={SLOTS.findIndex(({ route }) => route === current)}
        items={itemsWith(partyBadge)}
        line={false}
        onSelect={(index) => {
          const route = SLOTS[index]?.route ?? null;
          if (route === null) {
            showNotReady();
          } else {
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
