/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AnswerReply, Cuisine } from '@/api/assistant-types';
import { color, radius, size, space, text } from '@/design-system';
import { kindChipsOf, kindOn } from '@/features/assistant/meal-kinds';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

interface KindChipsProps {
  answer: AnswerReply | null;
  // Chooses a kind on the phone, or clears it with null.
  onChoose: (kind: Cuisine | null) => void;
}

// The kinds of food of a meal answer as the dock's first chips (P04 ticket 16, boards 24 and 25): a small grey "종류",
// then a chip per kind with its count of places. The kind on screen is filled; a press chooses another, and a second
// press clears it. Nothing with fewer than two kinds.
export function KindChips({ answer, onChoose }: KindChipsProps): ReactElement | null {
  const chips = answer === null ? [] : kindChipsOf(answer.plans);
  if (chips.length === 0) {
    return null;
  }
  const chosen = kindOn(answer);
  return (
    <>
      <Text style={styles.label}>종류</Text>
      {chips.map(({ kind, places }) => {
        const on = kind === chosen;
        return (
          <Pressable
            accessibilityLabel={`${kind} ${String(places)}곳`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            hitSlop={HIT_SLOP}
            key={kind}
            onPress={() => {
              onChoose(on ? null : kind);
            }}
            style={({ pressed }) => [styles.chip, on && styles.on, pressed && styles.pressed]}
          >
            <Text style={[styles.words, on && styles.onWords]}>{`${kind} ${String(places)}`}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...text.caption, color: color.inkMuted },
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
