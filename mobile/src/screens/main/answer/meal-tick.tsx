/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { color, font, space, text } from '@/design-system';
import { MEAL_NAMES } from '@/features/dining/adapter';
import { otherMealInput } from '@/features/assistant/meal-kinds';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

// Where the day's other meal stands on the bar: dinner after lunch at the right end, lunch before dinner at the left.
export type TickSide = 'left' | 'right';

// The other meal of a meal answer's day as the bar's tick (P04 ticket 16, board 26), or null when the answer has none:
// it is over today, or nothing serves it that day.
export function mealTickOf(answer: AnswerReply | null): { side: TickSide; words: string } | null {
  const other = answer?.otherMeal ?? null;
  if (answer?.input.kind !== 'meal' || other === null || other.meal === answer.input.meal) {
    return null;
  }
  const name = MEAL_NAMES[other.meal];
  return other.meal === 'dinner'
    ? { side: 'right', words: `${name} ${other.start} ›` }
    : { side: 'left', words: `‹ ${name} ${other.start}` };
}

// The tick: a press asks for the other meal's answer with no turn to the model, as a drag on the bar does.
export function MealTick({
  shown,
  words,
}: {
  shown: Pick<ShownAnswer, 'answer' | 'change' | 'recalculating'>;
  words: string;
}): ReactElement {
  const other = shown.answer?.otherMeal ?? null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: shown.recalculating }}
      disabled={shown.recalculating}
      hitSlop={space[2]}
      onPress={() => {
        if (other !== null) {
          shown.change((input) => (input.kind === 'meal' ? otherMealInput(input, other.meal) : input));
        }
      }}
      style={({ pressed }) => pressed && styles.pressed}
      testID="meal-tick"
    >
      <Text style={styles.words}>{words}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  words: { ...text.caption, fontFamily: font.bold, color: color.ink },
});
