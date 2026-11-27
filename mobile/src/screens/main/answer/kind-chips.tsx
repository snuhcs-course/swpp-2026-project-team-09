/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { AnswerReply, Cuisine, Plan } from '@/api/assistant-types';
import { color, radius, size, space, text } from '@/design-system';
import { kindChipsOf, kindOn } from '@/features/assistant/meal-kinds';
import { conditionChipsOf, fittingPlans } from '@/features/assistant/meal-price';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { ConditionChips } from './condition-chip';
import { type StudyKind, studyKindsOf } from './study-rows';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

interface KindChipsProps {
  answer: AnswerReply | null;
  // A Plan is being sent or is made, or a recalculation is on its way: no kind is chosen, for it may move the pick.
  disabled: boolean;
  // Chooses a kind on the phone, or clears it with null.
  onChoose: (kind: Cuisine | null) => void;
  // Asks for the answer without a condition set in words (P04 ticket 92).
  change: ShownAnswer['change'];
  // A study answer's kind of space chosen on the phone, and its choice (P10 ticket 18); null for a meal answer.
  study: { chosen: StudyKind | null; onChoose: (kind: StudyKind | null) => void } | null;
}

function Chip({
  words,
  said,
  on,
  disabled,
  onPress,
}: {
  words: string;
  said: string;
  on: boolean;
  disabled: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={said}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on && styles.on, (pressed || disabled) && styles.pressed]}
    >
      <Text style={[styles.words, on && styles.onWords]}>{words}</Text>
    </Pressable>
  );
}

// A chip of a kind: its words, its count of places, and what a press on it does.
interface Choice {
  key: string;
  places: number;
  pick: () => void;
}

// The kinds a list offers: a meal answer's kinds of food, whose choice its conditions keep; or a study answer's kinds of
// space, chosen on the phone alone (P10 ticket 18). None with one place alone.
function choicesOf(
  answer: AnswerReply,
  plans: readonly Plan[],
  { onChoose, study }: Pick<KindChipsProps, 'onChoose' | 'study'>,
): { chosen: string | null; clear: () => void; choices: Choice[] } {
  if (study !== null) {
    const kinds = plans.length < 2 ? [] : studyKindsOf(plans);
    const choices = kinds.map(({ kind, places }) => ({
      key: kind,
      places,
      pick: (): void => {
        study.onChoose(kind === study.chosen ? null : kind);
      },
    }));
    return {
      chosen: study.chosen,
      clear: () => {
        study.onChoose(null);
      },
      choices,
    };
  }
  const chosen = kindOn(answer);
  const choices = (plans.length < 2 ? [] : kindChipsOf(plans)).map(({ kind, places }) => ({
    key: kind,
    places,
    pick: (): void => {
      onChoose(kind === chosen ? null : kind);
    },
  }));
  return {
    chosen,
    clear: () => {
      onChoose(null);
    },
    choices,
  };
}

// The kinds of food of a meal answer over its list (board E3), which filter it: "전체" with the count of every
// candidate, then a chip per kind with its count of places. The kind on screen is filled, and the map recedes the
// candidates without it (P04 ticket 16). No kinds with fewer than two of them, or with one candidate alone. Before them,
// the conditions set in words, each with its ✕, and a thin line (P04 ticket 92); the places over a price ceiling are
// not counted. A study answer's kinds of space stand the same way, on the phone alone (P10 ticket 18).
export function KindChips(props: KindChipsProps): ReactElement | null {
  const { answer, disabled, change } = props;
  const plans = answer === null ? [] : fittingPlans(answer);
  if (answer === null) {
    return null;
  }
  const { chosen, clear, choices } = choicesOf(answer, plans, props);
  if (choices.length === 0 && conditionChipsOf(answer).length === 0) {
    return null;
  }
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      testID="kind-chips"
    >
      <ConditionChips answer={answer} change={change} disabled={disabled} divided={choices.length > 0} />
      {choices.length === 0 ? null : (
        <Chip
          disabled={disabled}
          on={chosen === null}
          onPress={clear}
          said={`전체 ${String(plans.length)}곳`}
          words={`전체 ${String(plans.length)}`}
        />
      )}
      {choices.map(({ key, places, pick }) => (
        <Chip
          disabled={disabled}
          key={key}
          on={key === chosen}
          onPress={pick}
          said={`${key} ${String(places)}곳`}
          words={`${key} ${String(places)}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[1] },
  chip: {
    flexShrink: 0,
    justifyContent: 'center',
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  on: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
  pressed: { opacity: 0.6 },
  words: { ...text.label, color: color.ink },
  onWords: { color: color.onPrimary },
});
