import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavItem, color, shadow, useNotReadyToast, useToastAbove } from '@/design-system';
import { usePartyBadge } from '@/features/parties/use-party-badge';
import { navPaddingBottom, takenUnderToast } from './layout';

const MAP = 0;

// The `Main` frame's five slots. 올리기 is the action in the middle; a long press on it does nothing.
function itemsWith(partyBadge: number): BottomNavItem[] {
  return [
    { icon: 'map', label: '지도' },
    { icon: 'users', label: '파티', badge: partyBadge },
    { icon: 'plus', label: '올리기', action: true },
    { icon: 'calendar', label: '행사' },
    { icon: 'user', label: '내 정보' },
  ];
}

// The main screen's bottom navigation, as the `Main` frame draws it: no line on top but a soft shadow over the map,
// and 16 under the items, or the phone's own bar where that is higher. 지도 is where the User is; every other slot
// belongs to another task and says that it is not ready. A toast on this screen sits above it.
export function MainNav(): ReactElement {
  const partyBadge = usePartyBadge();
  const showNotReady = useNotReadyToast();
  const { bottom } = useSafeAreaInsets();
  useToastAbove(takenUnderToast(bottom));
  return (
    <View style={[styles.bar, { paddingBottom: navPaddingBottom(bottom) }]}>
      <BottomNav
        active={MAP}
        items={itemsWith(partyBadge)}
        line={false}
        onSelect={(index) => {
          if (index !== MAP) {
            showNotReady();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.surface, boxShadow: shadow.nav },
});
