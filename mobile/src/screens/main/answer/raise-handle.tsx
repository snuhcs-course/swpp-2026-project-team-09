/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color, radius, space, text } from '@/design-system';

export const CLOSE_HINT = '놓으면 지도 화면으로 돌아가요';

// How far a fling carries the let-go point, in seconds of its speed.
export const FLING_S = 0.15;
// How long the card takes to reach a step, or to come back (P04 ticket 52).
export const MOTION_MS = 220;

// The answer card's heights, lowered, raised, and full (`card-levels.ts`), and below them the answer closed (P04 tickets
// 12 and 52).
export interface Raising {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  // The raised card taken one step further up, its top just under the status bar. Left out, the card has no such step.
  full?: boolean;
  setFull?: (full: boolean) => void;
  // Closes the answer as ✕ does: a drag down from the lowered card past half its height. Left out, none.
  close?: () => void;
  // The card is dragged below its lowered height, or no longer.
  onPast?: (past: boolean) => void;
  // What a drag down takes away first, as back does: the list of questions, a mark's card, or a restaurant's menu, one
  // layer a drag, before the raised card is lowered or the answer closed (P04 ticket 52). Left out or null, none.
  layer?: (() => void) | null;
  // One step down from a raised or full card, as back takes it: full to raised, a layer, then lowered. Left out, the
  // raised card is lowered.
  stepDown?: () => void;
}

// The card's header takes the drag (`useCardMotion`) wherever the finger starts on it, the grip, its label, or beside
// the chip and the buttons; a press on the chip or a button stays a press.
export function DragRow({ pan, children }: { pan: PanGesture; children: ReactElement }): ReactElement {
  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
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
