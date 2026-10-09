/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Animated, type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { useInsets } from './insets';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { Overlay } from './overlay';
import { color, radius, space } from './tokens';
import { useSlide } from './use-slide';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  // The sheet's name, such as "AI 매칭": the scrim is read as "AI 매칭 닫기".
  label: string;
  children: ReactNode;
}

// How far down a drag from the handle goes before the sheet closes.
const DRAG_TO_CLOSE = 48;
const RISE = 600;

// A drag down from the handle closes the sheet: where the touch ended, against where it started.
function useDragDown(onClose: () => void): {
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
} {
  const [startY, setStartY] = useState<number | null>(null);
  return {
    onTouchStart: ({ nativeEvent }) => {
      setStartY(nativeEvent.pageY);
    },
    onTouchEnd: ({ nativeEvent }) => {
      if (startY !== null && nativeEvent.pageY - startY >= DRAG_TO_CLOSE) {
        onClose();
      }
      setStartY(null);
    },
  };
}

// A sheet that rises from the bottom over the whole screen, the bottom navigation too, as the frames draw them: a
// handle, a top radius of 24 and the scrim. A press on the scrim, Android's back button or a drag down from the
// handle closes it.
export function BottomSheet({ open, onClose, label, children }: BottomSheetProps): ReactElement | null {
  const { shown, progress } = useSlide(open);
  const drag = useDragDown(onClose);
  const { bottom } = useInsets();
  useBackToClose(open, onClose);
  if (!shown) {
    return null;
  }
  return (
    <Overlay>
      <View style={styles.layer}>
        <Animated.View style={[styles.layer, { opacity: progress }]}>
          <Pressable
            accessibilityLabel={`${label} 닫기`}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.scrim}
          />
        </Animated.View>
        <Animated.View
          accessibilityLabel={label}
          style={[
            styles.sheet,
            { paddingBottom: space[4] + bottom },
            { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }] },
          ]}
        >
          <View onTouchEnd={drag.onTouchEnd} onTouchStart={drag.onTouchStart} style={styles.grip} testID="sheet-handle">
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  scrim: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    maxHeight: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: '0 -4px 24px rgba(14, 19, 48, 0.12)',
  },
  // The handle's touch area spans the sheet's top.
  grip: { alignItems: 'center', justifyContent: 'center', height: space[6] },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.border },
});
