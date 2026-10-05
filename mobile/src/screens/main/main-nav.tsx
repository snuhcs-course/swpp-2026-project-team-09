import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavItem, color, useNotReadyToast, useToastAbove } from '@/design-system';
import { usePartyBadge } from '@/features/parties/use-party-badge';
import { TAKEN_UNDER_TOAST } from './layout';

const MAP = 0;

// The `Main` frame's five slots. 올리기 is the action in the middle; a long press on it does nothing.
function itemsWith(partyBadge: number): BottomNavItem[] {
  return [
    { icon: 'map', label: '지도' },
    { icon: 'users', label: '파티', badge: partyBadge },
    { icon: 'plus', label: '올리기', raised: true },
    { icon: 'calendar', label: '행사' },
    { icon: 'user', label: '내 정보' },
  ];
}

// The main screen's bottom navigation, above the phone's own bar. 지도 is where the User is; every other slot
// belongs to another task and says that it is not ready. A toast on this screen sits above it.
export function MainNav(): ReactElement {
  const partyBadge = usePartyBadge();
  const showNotReady = useNotReadyToast();
  const { bottom } = useSafeAreaInsets();
  useToastAbove(TAKEN_UNDER_TOAST);
  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      <BottomNav
        active={MAP}
        items={itemsWith(partyBadge)}
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
  bar: { backgroundColor: color.surface },
});
