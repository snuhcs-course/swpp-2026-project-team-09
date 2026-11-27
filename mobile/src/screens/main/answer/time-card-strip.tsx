/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { color, radius, shadow, space } from '@/design-system';
import { STRIP_SLOP, type TimeCardGrip } from './time-card-grip';

// The time card's grip and its strip (moved out of `time-bar.tsx` for its length), and the parts the strip of a step
// with no time card shares with it (`steps-strip.tsx`, P01 ticket 22).

// The gap over the grip's strip, which the folded height counts (`useFoldedHeight`).
export const STRIP_TOP = space[1];

// The card's face: its corners, its white and its shadow.
export const CARD_FACE = { borderRadius: radius.xl, backgroundColor: color.surface, boxShadow: shadow.float } as const;

// The grip's line in the middle of a strip.
export function GripLine(): ReactElement {
  return <View style={styles.grip} />;
}

// The bar's grip in its strip, the card's whole width at its bottom (the user's phone check), under a hairline that
// parts it from the card's content as the answer sheet's header is parted, left out when the card is tucked to the
// strip alone. A drag anywhere on the strip moves the card between tucked, its place, and open (`useTimeCardGrip`); a
// press opens it or folds it again, and a screen reader tucks it away or back.
export function Grip(p: {
  grip: TimeCardGrip;
  folded: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
}): ReactElement {
  const { grip, folded } = p;
  return (
    <GestureDetector gesture={grip.pan}>
      <Pressable
        accessibilityActions={grip.actions}
        accessibilityLabel={`사람별 시간 ${folded ? '펼치기' : '접기'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !folded }}
        hitSlop={STRIP_SLOP}
        onAccessibilityAction={({ nativeEvent }) => {
          grip.onAction(nativeEvent.actionName);
        }}
        onLayout={p.onLayout}
        onPress={grip.toggle}
        style={styles.strip}
        testID="time-card-grip"
      >
        {grip.place === 'tucked' || grip.place === 'behind' ? null : (
          <View style={styles.rule} testID="time-card-rule" />
        )}
        <GripLine />
      </Pressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The card's whole width, its padding included, 20 high from the hairline to the card's edge (`TUCK_STRIP`).
  strip: { alignItems: 'center', marginTop: STRIP_TOP, marginHorizontal: -space[4], paddingVertical: space[2] },
  rule: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
  },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
});
