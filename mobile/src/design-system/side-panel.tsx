/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { Glass } from './glass';
import { Overlay } from './overlay';
import { color, radius } from './tokens';
import { useSlide } from './use-slide';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  // The panel's name, such as "친구": the scrim is read as "친구 패널 닫기".
  label: string;
  // The panel is the glass layer's `inner` level over the map, as the changelog of 11.24 (§ 4-3) draws the friend
  // panel, in place of white.
  glass?: boolean;
  children: ReactNode;
}

// The frames' width of a panel from the left.
const WIDTH = 324;

// A panel that slides in from the left over the whole screen, the bottom navigation too, as the `MainFriends` frame
// draws it. A scrim covers the rest; a press on it, or Android's back button, closes the panel.
export function SidePanel({ open, onClose, label, glass = false, children }: SidePanelProps): ReactElement | null {
  const { shown, progress } = useSlide(open);
  useBackToClose(open, onClose);
  if (!shown) {
    return null;
  }
  return (
    <Overlay>
      <View style={styles.layer}>
        <Animated.View style={[styles.layer, { opacity: progress }]}>
          <Pressable
            accessibilityLabel={`${label} 패널 닫기`}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.scrim}
          />
        </Animated.View>
        <Animated.View
          accessibilityLabel={label}
          style={[
            styles.panel,
            glass && styles.clear,
            {
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH * 1.1, 0] }) }],
            },
          ]}
        >
          {glass ? (
            <Glass level="inner" style={styles.fill}>
              {children}
            </Glass>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  scrim: { flex: 1, backgroundColor: color.scrim },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: WIDTH,
    maxWidth: '88%',
    overflow: 'hidden',
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: '4px 0 24px rgba(14, 19, 48, 0.16)',
  },
  clear: { backgroundColor: 'transparent' },
  fill: { flex: 1 },
});
