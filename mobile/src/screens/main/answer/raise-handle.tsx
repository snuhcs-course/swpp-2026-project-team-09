/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color, radius, space, text } from '@/design-system';
import type { Level } from './card-levels';

export const CLOSE_HINT = '놓으면 지도 화면으로 돌아가요';

// How long the card takes to reach a step, or to come back (P04 ticket 52).
export const MOTION_MS = 220;

// The answer sheet's steps, low, middle, and high (`card-levels.ts`), and under low the answer closed (P04 tickets 12
// and 61).
export interface Raising {
  level: Level;
  setLevel: (level: Level) => void;
  // Closes the answer as ✕ does: one more drag down from low, or a fling. Left out, none.
  close?: () => void;
  // The card is dragged below low, or no longer.
  onPast?: (past: boolean) => void;
}

// Where "놓으면 지도 화면으로 돌아가요" stands, from the stage's bottom: just above the card's top edge, following the card
// down as it is dragged, and stopping just above the AI input, whose room the card keeps (`barRoom`), so that it is
// never behind the input or below the screen (P04 ticket 29). `maxDrop` is how far it follows.
export const HINT_GAP = space[3];

export function closeHintPlace(cardHeight: number, barRoom: number): { bottom: number; maxDrop: number } {
  return { bottom: cardHeight + HINT_GAP, maxDrop: Math.max(0, cardHeight - barRoom) };
}

// The hint while letting go would close the answer, moved down with the card by `drop` as far as `maxDrop`.
export function CloseHint({
  drop,
  cardHeight,
  barRoom,
}: {
  drop: SharedValue<number>;
  cardHeight: number;
  barRoom: number;
}): ReactElement {
  const { bottom, maxDrop } = closeHintPlace(cardHeight, barRoom);
  const down = useAnimatedStyle(() => ({ transform: [{ translateY: Math.min(Math.max(drop.value, 0), maxDrop) }] }));
  return (
    <Reanimated.View style={[styles.hint, { bottom }, down]} testID="answer-close-hint">
      <Text style={styles.hintWords}>{CLOSE_HINT}</Text>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    pointerEvents: 'none',
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.ink,
  },
  hintWords: { ...text.label, color: color.surface },
});
