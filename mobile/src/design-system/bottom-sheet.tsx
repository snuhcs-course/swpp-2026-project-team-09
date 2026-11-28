/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useCallback, useMemo, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useInsets } from './insets';
import { Overlay } from './overlay';
import { type SheetPull, useBodyPan, useScrollTop, useSheetPan, useSheetPull } from './sheet-pull';
import { type SheetBody, SheetBodyContext } from './sheet-scroll';
import { color, radius, space } from './tokens';
import { useSlide } from './use-slide';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  // The sheet's name, such as "파티 찾기": the scrim is read as "파티 찾기 닫기".
  label: string;
  // What stays on top under the handle, such as the title, closed by a thin rule: with the handle, what drags the sheet.
  head?: ReactNode;
  // False for a body of wheels to scroll, which a pull down would take from them: then only the handle and the head
  // drag the sheet.
  pullBody?: boolean;
  // The whole sheet's, head and body.
  testID?: string;
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

// How the sheet closes, by one call of `onClose`: Android's back while it is open, and the taps and the drag, which do
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

// The scrim fades in with the slide, and out as the sheet is dragged down.
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

// The handle bar and the head, closed by the rule: a tap on the bar closes the sheet, and a drag on either pulls it.
// The scrim's button is what a screen reader offers.
function Top({ head, pan, onClose }: { head: ReactNode; pan: PanGesture; onClose: () => void }): ReactElement {
  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false}>
        <Pressable accessible={false} onPress={onClose} style={styles.grip} testID="sheet-handle">
          <View style={styles.handle} />
        </Pressable>
        {head === undefined ? null : (
          <View style={styles.head} testID="sheet-head">
            {head}
          </View>
        )}
        <View style={styles.rule} testID="sheet-rule" />
      </View>
    </GestureDetector>
  );
}

// The body's pull, and where a `SheetScroll` inside keeps its scroll.
function useBody(sheet: SheetPull): SheetBody {
  const scrollTop = useScrollTop();
  const pan = useBodyPan(sheet, scrollTop);
  return useMemo(() => ({ pan, scrollTop }), [pan, scrollTop]);
}

function PulledBody({ body, children }: { body: SheetBody; children: ReactNode }): ReactElement {
  return (
    <SheetBodyContext value={body}>
      <GestureDetector gesture={body.pan}>
        <View collapsable={false} style={styles.body}>
          {children}
        </View>
      </GestureDetector>
    </SheetBodyContext>
  );
}

// A sheet that rises from the bottom over the whole screen, the bottom navigation too, as the frames draw them: a
// handle, its head closed by a thin rule, a top radius of 24 and the scrim. A tap on the scrim or on the handle bar, a
// drag down on the handle bar or the head, a pull down on a body that does not scroll or whose `SheetScroll` is at its
// top (`sheet-pull.ts`), or Android's back button closes it, each by one call of `onClose`, and it slides down with
// what it showed. Content that scrolls in a sheet scrolls in a `SheetScroll`, so that the pull and the scroll share. While the phone's keyboard is up the sheet stands on it, at most 90% of what is left above it, so that a
// search at its top and the first rows under it stay in view.
export function BottomSheet({
  open,
  onClose,
  label,
  head,
  pullBody = true,
  testID,
  children,
}: BottomSheetProps): ReactElement | null {
  const { shown, progress } = useSlide(open);
  const insets = useInsets();
  const keyboard = useKeyboardHeight(insets.bottom);
  // The keyboard covers the phone's own bar.
  const bottom = keyboard > 0 ? 0 : insets.bottom;
  const close = useClose(open, onClose);
  const content = useLastContent(open, children);
  const sheet = useSheetPull(open, shown, close);
  const pan = useSheetPan(sheet);
  const body = useBody(sheet);
  const { down, height } = sheet;
  const pulled = useAnimatedStyle(() => ({ transform: [{ translateY: down.value }] }));
  const risen = progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] });
  if (!shown) {
    return null;
  }
  return (
    <Overlay>
      {/* Sliding out, it lets touches through to the screen under it. */}
      <View style={[styles.layer, { pointerEvents: open ? 'auto' : 'none' }]}>
        <Scrim label={label} onPress={close} progress={progress} sheet={sheet} />
        <View style={[styles.room, { bottom: keyboard }]} testID="sheet-room">
          <Animated.View style={[styles.room, styles.whole, { transform: [{ translateY: risen }] }]}>
            <Reanimated.View
              accessibilityLabel={label}
              onLayout={({ nativeEvent }: LayoutChangeEvent) => {
                height.value = nativeEvent.layout.height;
              }}
              style={[styles.sheet, { paddingBottom: space[4] + bottom }, pulled]}
              testID={testID}
            >
              <Top head={head} onClose={close} pan={pan} />
              {pullBody ? <PulledBody body={body}>{content}</PulledBody> : content}
            </Reanimated.View>
          </Animated.View>
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
  // The head's own words keep their side padding, as the sheet's body does.
  head: { paddingBottom: space[3] },
  // The Assistant's answer card closes its head with the same line (`card-header.tsx`).
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.border },
  body: { flexShrink: 1, paddingTop: space[3] },
});
