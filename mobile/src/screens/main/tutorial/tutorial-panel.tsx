/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-29  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Glass, Overlay, radius, space } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { useCoverMap } from '../map-cover';

interface TutorialPanelProps {
  open: boolean;
  // The panel's name, such as "새내기 튜토리얼": with `onScrimPress`, the dim is read as "{label} 닫기".
  label: string;
  // Android's back button.
  onClose: () => void;
  // A tap on the dim around the panel; left out, the dim takes the tap and does nothing.
  onScrimPress?: () => void;
  children: ReactNode;
}

// The 새내기 튜토리얼's list and a quest's window (P06 ticket 60): a glass panel that floats over the map, 12 from the
// sides and 12 above the phone's own bar, over a light dim that leaves the map in sight. While it is open, the map's
// floating parts and the tab bar give way (`useCoverMap`, as the friend panel and the Quest list do), so that only the
// map shows through its glass. Its content scrolls when it is higher than the room it has.
export function TutorialPanel({
  open,
  label,
  onClose,
  onScrimPress,
  children,
}: TutorialPanelProps): ReactElement | null {
  const insets = useSafeAreaInsets();
  useBackToClose(open, onClose);
  useCoverMap(open);
  if (!open) {
    return null;
  }
  return (
    <Overlay>
      <View style={styles.layer}>
        {onScrimPress === undefined ? (
          <View style={styles.scrim} />
        ) : (
          <Pressable
            accessibilityLabel={`${label} 닫기`}
            accessibilityRole="button"
            onPress={onScrimPress}
            style={styles.scrim}
          />
        )}
        <View style={[styles.room, { top: insets.top + space[3], bottom: insets.bottom + space[3] }]}>
          <Glass accessibilityLabel={label} accessibilityViewIsModal level="panel" style={styles.panel}>
            {children}
          </Glass>
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrimLight },
  // Where the panel stands, docked at its bottom: touches beside it go to the dim.
  room: {
    position: 'absolute',
    right: space[3],
    left: space[3],
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  panel: { flexShrink: 1, maxHeight: '100%', overflow: 'hidden', borderRadius: radius.xl },
});
