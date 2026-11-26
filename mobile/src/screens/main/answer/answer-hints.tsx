/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';
import type { AnswerOffer } from '@/api/refusal-types';
import { color, Glass, radius, space, text } from '@/design-system';
import { openScreen } from './refusal-reply';

// A meal Plan's offers as hint lines under the Assistant's words (P04 ticket 86): one see-through line each, the whole
// line pressed, a "›" at its end, no button and no confirm. A main server before the ticket sends no hint, and the
// line says the offer's label.
export function AnswerHints({ offers }: { offers: readonly AnswerOffer[] }): ReactElement | null {
  if (offers.length === 0) {
    return null;
  }
  return (
    <>
      {offers.map((offer) => {
        const words = offer.hint ?? offer.label;
        return (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="button"
            key={offer.screen}
            onPress={() => {
              openScreen(offer.screen);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => pressed && styles.pressed}
            testID={`answer-hint-${offer.screen}`}
          >
            <Glass level="field" style={styles.hint}>
              <Text numberOfLines={1} style={styles.words}>
                {words}
              </Text>
              <Text style={styles.more}>›</Text>
            </Glass>
          </Pressable>
        );
      })}
    </>
  );
}

// The words a meal Plan's card says once: the note, when a hint line already says it.
export function saidByHint(note: string | undefined, hints: readonly AnswerOffer[]): boolean {
  return note !== undefined && hints.some(({ hint }) => hint === note);
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 32,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  words: { ...text.caption, flex: 1, color: color.inkMuted },
  more: { ...text.label, color: color.snuBlue },
  pressed: { opacity: 0.6 },
});
