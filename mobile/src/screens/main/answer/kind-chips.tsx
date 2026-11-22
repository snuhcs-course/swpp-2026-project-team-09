/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { AnswerReply, Cuisine } from '@/api/assistant-types';
import { color, radius, size, space, text } from '@/design-system';
import { kindChipsOf, kindOn } from '@/features/assistant/meal-kinds';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

interface KindChipsProps {
  answer: AnswerReply | null;
  // A Plan is being sent or is made, or a recalculation is on its way: no kind is chosen, for it may move the pick.
  disabled: boolean;
  // Chooses a kind on the phone, or clears it with null.
  onChoose: (kind: Cuisine | null) => void;
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

// The kinds of food of a meal answer over its list (board E3), which filter it: "전체" with the count of every
// candidate, then a chip per kind with its count of places. The kind on screen is filled, and the map recedes the
// candidates without it (P04 ticket 16). Nothing with fewer than two kinds.
export function KindChips({ answer, disabled, onChoose }: KindChipsProps): ReactElement | null {
  const chips = answer === null ? [] : kindChipsOf(answer.plans);
  if (answer === null || chips.length === 0) {
    return null;
  }
  const chosen = kindOn(answer);
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      testID="kind-chips"
    >
      <Chip
        disabled={disabled}
        on={chosen === null}
        onPress={() => {
          onChoose(null);
        }}
        said={`전체 ${String(answer.plans.length)}곳`}
        words={`전체 ${String(answer.plans.length)}`}
      />
      {chips.map(({ kind, places }) => (
        <Chip
          disabled={disabled}
          key={kind}
          on={kind === chosen}
          onPress={() => {
            onChoose(kind === chosen ? null : kind);
          }}
          said={`${kind} ${String(places)}곳`}
          words={`${kind} ${String(places)}`}
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
