/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, size, space, text } from '@/design-system';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { mealCard } from './meal-list';

// The arrows are as high as a button, and their touch area reaches the design system's minimum.
const ARROW = 40;
const ARROW_SLOP = (size.touchMin - ARROW) / 2;
// At least as wide as "11/11" (the main server answers with up to eleven Plans): a large font widens it rather than
// cutting it.
const COUNT_WIDTH = 44;

function Arrow({ next, disabled, onPress }: { next: boolean; disabled: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={next ? '다음 후보' : '이전 후보'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={ARROW_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <Icon color={disabled ? color.inkMuted : color.ink} name={next ? 'chevronRight' : 'chevronLeft'} size={20} />
    </Pressable>
  );
}

// "‹ 1/3 ›" for an answer whose other Plans are nowhere else in sight: its scene draws no candidate, as an events or a
// parties answer's does, and its card lists none. With candidates on the map their numbered flags switch the Plan, and
// with a list in the card (a meal's, or a study answer's: `mealCard`) its rows do, so nothing stands here: in a step
// exactly as alone, where the steps' flags take the candidates' place on the map but the list stays (P03 ticket 25).
export function PlanStepper({
  shown,
  busy,
  steps = false,
}: {
  shown: ShownAnswer;
  busy: boolean;
  // One of several requests, whose candidates the steps' flags take the place of (P04 ticket 09).
  steps?: boolean;
}): ReactElement | null {
  const { answer, plan, index, browse } = shown;
  const count = answer?.plans.length ?? 0;
  const flagged = !steps && plan?.scene.places.some(({ role }) => role === 'candidate') === true;
  if (plan === null || count < 2 || mealCard(answer) || flagged) {
    return null;
  }
  return (
    <View style={styles.row} testID="plan-stepper">
      <Arrow
        disabled={busy}
        next={false}
        onPress={() => {
          browse(-1);
        }}
      />
      <Text numberOfLines={1} style={styles.count} testID="plan-count">
        {`${String(index + 1)}/${String(count)}`}
      </Text>
      <Arrow
        disabled={busy}
        next
        onPress={() => {
          browse(1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: space[2] },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.85 },
  count: { ...text.label, minWidth: COUNT_WIDTH, color: color.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
