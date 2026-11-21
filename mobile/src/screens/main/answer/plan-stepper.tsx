/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, size, space, text } from '@/design-system';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

// The arrows are as high as a button, and their touch area reaches the design system's minimum.
const ARROW = 40;
const ARROW_SLOP = (size.touchMin - ARROW) / 2;
// Wide enough for "11/11": the main server answers with up to eleven Plans.
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

// "‹ 1/3 ›" for an answer whose other Plans have no flag on the map: its scene draws no candidate, as an events or a
// parties answer's does. With candidates on the map, their numbered flags switch the Plan and nothing stands here.
export function PlanStepper({ shown, busy }: { shown: ShownAnswer; busy: boolean }): ReactElement | null {
  const { answer, plan, index, browse } = shown;
  const count = answer?.plans.length ?? 0;
  if (plan === null || count < 2 || plan.scene.places.some(({ role }) => role === 'candidate')) {
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
  count: { ...text.label, width: COUNT_WIDTH, color: color.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
