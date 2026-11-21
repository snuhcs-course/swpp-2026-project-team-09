/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { color, font, space, text } from '@/design-system';
import { MEAL_NAMES } from '@/features/dining/adapter';
import { otherMealInput } from '@/features/assistant/meal-kinds';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { koreaDayWord, koreaMinutes } from '@/korea-time';

// When each meal's window opens on the main server, in minutes after midnight.
const MEAL_OPENS = { lunch: 11 * 60, dinner: 17 * 60 } as const;

// The words before a meal's span on the bar (board 26): the meal with its day ("내일(월) 점심"), or the meal alone today
// before it opens ("저녁"); left out while it is under way today, when the day word is the bar's own.
export function mealDayOf(answer: AnswerReply, plan: Plan): string | undefined {
  const { input } = answer;
  if (input.kind !== 'meal') {
    return undefined;
  }
  const now = new Date(plan.band.now);
  const day = koreaDayWord(plan.band.startAt, now);
  if (day === '' && koreaMinutes(now) >= MEAL_OPENS[input.meal]) {
    return undefined;
  }
  return day === '' ? MEAL_NAMES[input.meal] : `${day} ${MEAL_NAMES[input.meal]}`;
}

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
  sent,
  words,
}: {
  shown: Pick<ShownAnswer, 'answer' | 'change' | 'recalculating'>;
  // A Plan is being sent or is made: the other meal is not asked for, as the band takes no drag then.
  sent: boolean;
  words: string;
}): ReactElement {
  const other = shown.answer?.otherMeal ?? null;
  const disabled = sent || shown.recalculating;
  return (
    <Pressable
      accessibilityLabel={words.replaceAll(/[‹›]/gu, '').trim()}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
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
