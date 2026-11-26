/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { color, Icon, radius, size, space, text } from '@/design-system';
import { conditionChipsOf, withoutCondition } from '@/features/assistant/meal-price';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;
const X_SIZE = 14;

// A condition the User set in words, before the kinds of food of a meal's list (P04 ticket 92, the design page "밥 조건
// 두 가지"): an ink edge and a ✕, apart from the kind chips, which choose. A press takes the condition away.
function ConditionChip({
  words,
  disabled,
  onTakeAway,
}: {
  words: string;
  disabled: boolean;
  onTakeAway: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${words} 조건 빼기`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onTakeAway}
      style={({ pressed }) => [styles.chip, (pressed || disabled) && styles.pressed]}
      testID="condition-chip"
    >
      <Text style={styles.words}>{words}</Text>
      <Icon color={color.ink} name="x" size={X_SIZE} />
    </Pressable>
  );
}

// The conditions of a meal answer set in words, the price first, before its kinds of food, and a thin line after them
// when kinds follow (`divided`). A press asks for the answer without that condition (`change`).
export function ConditionChips({
  answer,
  disabled,
  divided,
  change,
}: {
  answer: AnswerReply | null;
  disabled: boolean;
  divided: boolean;
  change: ShownAnswer['change'];
}): ReactElement {
  const chips = conditionChipsOf(answer);
  return (
    <>
      {chips.map(({ condition, words }) => (
        <ConditionChip
          disabled={disabled}
          key={condition}
          onTakeAway={() => {
            change((input) => withoutCondition(input, condition));
          }}
          words={words}
        />
      ))}
      {chips.length > 0 && divided ? <View style={styles.divider} testID="condition-divider" /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: CHIP_HEIGHT,
    paddingLeft: space[3],
    paddingRight: space[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.ink,
    backgroundColor: color.surface,
  },
  pressed: { opacity: 0.6 },
  words: { ...text.label, color: color.ink },
  divider: { width: 1, height: CHIP_HEIGHT - space[3], backgroundColor: color.border },
});
