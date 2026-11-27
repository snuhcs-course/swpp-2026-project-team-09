/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, type ReactNode, useCallback, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useInsets } from './insets';
import { Overlay } from './overlay';
import { type SheetPull, SheetPullContext, usePull, useSheetPull } from './sheet-pull';
import { color, radius, space } from './tokens';
import { useSlide } from './use-slide';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  // The sheet's name, such as "파티 찾기": the scrim is read as "파티 찾기 닫기".
  label: string;
  children: ReactNode;
}

const RISE = 600;

// What the sheet shows: its children while it is open, and while it slides out the children it last had open, though
// its caller has dropped them by then.
function useLastContent(open: boolean, children: ReactNode): ReactNode {
  const [last, setLast] = useState<ReactNode>(open ? children : null);
  if (open && children !== last) {
    setLast(children);
  }
  return open ? children : last;
}

// How the sheet closes, by one call of `onClose`: Android's back while it is open, and the taps and the swipe, which do
// nothing while it slides out.
function useClose(open: boolean, onClose: () => void): () => void {
  useBackToClose(open, onClose);
  return useCallback(() => {
    if (open) {
      onClose();
    }
  }, [open, onClose]);
}

interface ScrimProps {
  label: string;
  progress: Animated.Value;
  sheet: SheetPull;
  onPress: () => void;
}

// The scrim fades in with the slide, and out as the sheet is swiped down.
function Scrim({ label, progress, sheet, onPress }: ScrimProps): ReactElement {
  const { down, height } = sheet;
  const dimmed = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, down.value / Math.max(height.value, 1)) }));
  return (
    <Animated.View style={[styles.layer, { opacity: progress }]}>
      <Reanimated.View style={[styles.layer, dimmed]}>
        <Pressable
          accessibilityLabel={`${label} 닫기`}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.scrim}
        />
      </Reanimated.View>
    </Animated.View>
  );
}

// A sheet that rises from the bottom over the whole screen, the bottom navigation too, as the frames draw them: a
// handle, a top radius of 24 and the scrim. A tap on the scrim or on the handle bar, Android's back button, or a swipe
// down from anywhere on it closes it (`sheet-pull.ts`), each by one call of `onClose`, and it slides down with what it
// showed. While the phone's keyboard is up the sheet stands on it, at most 90% of what is left above it, so that a
// search at its top and the first rows under it stay in view.
export function BottomSheet({ open, onClose, label, children }: BottomSheetProps): ReactElement | null {
  const { shown, progress } = useSlide(open);
  const insets = useInsets();
  const keyboard = useKeyboardHeight(insets.bottom);
  // The keyboard covers the phone's own bar.
  const bottom = keyboard > 0 ? 0 : insets.bottom;
  const close = useClose(open, onClose);
  const content = useLastContent(open, children);
  const sheet = useSheetPull(open, shown, close);
  const pan = usePull(sheet, null).gesture.withRef(sheet.ref);
  const { down, height } = sheet;
  const pulled = useAnimatedStyle(() => ({ transform: [{ translateY: down.value }] }));
  if (!shown) {
    return null;
  }
  return (
    <Overlay>
      {/* Sliding out, it lets touches through to the screen under it. */}
      <View style={[styles.layer, { pointerEvents: open ? 'auto' : 'none' }]}>
        <Scrim label={label} onPress={close} progress={progress} sheet={sheet} />
        <View style={[styles.room, { bottom: keyboard }]} testID="sheet-room">
          <Reanimated.View style={[styles.room, styles.whole, pulled]}>
            <GestureDetector gesture={pan}>
              <Animated.View
                accessibilityLabel={label}
                onLayout={({ nativeEvent }: LayoutChangeEvent) => {
                  height.value = nativeEvent.layout.height;
                }}
                style={[
                  styles.sheet,
                  { paddingBottom: space[4] + bottom },
                  { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }] },
                ]}
              >
                {/* The bar's touch row: a tap closes the sheet. The scrim's button is what a screen reader offers. */}
                <Pressable accessible={false} onPress={close} style={styles.grip} testID="sheet-handle">
                  <View style={styles.handle} />
                </Pressable>
                <SheetPullContext value={sheet}>{content}</SheetPullContext>
              </Animated.View>
            </GestureDetector>
          </Reanimated.View>
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  scrim: { flex: 1, backgroundColor: color.scrim },
  // Where the sheet stands: the whole screen, or what the keyboard leaves of it. Touches above the sheet go to the scrim.
  room: { position: 'absolute', top: 0, right: 0, left: 0, pointerEvents: 'box-none' },
  whole: { bottom: 0 },
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
