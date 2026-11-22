/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color, radius, space, text } from '@/design-system';
import { GRIP_ROW, GRIP_SIDE } from './grip-row';

export const RAISE_LABEL = '답 크게 보기';
export const CLOSE_LABEL = '답 닫기';
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

// The grip in the middle of the card's header row, which the drag (`useCardMotion`) moves. A press raises the lowered
// card, and takes a raised or a full card one step down as back does, a layer first (`stepDown`).
export function Handle({ raising }: { raising: Raising }): ReactElement {
  const { raised, setRaised, full = false, setFull, close, stepDown } = raising;
  return (
    <Pressable
      accessibilityActions={close === undefined ? undefined : [{ name: 'close', label: CLOSE_LABEL }]}
      accessibilityLabel={RAISE_LABEL}
      accessibilityRole="button"
      accessibilityState={{ expanded: raised }}
      collapsable={false}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'close') {
          close?.();
        }
      }}
      onPress={() => {
        if (!raised) {
          setRaised(true);
        } else if (stepDown !== undefined) {
          stepDown();
        } else if (full && setFull !== undefined) {
          setFull(false);
        } else {
          setRaised(false);
        }
      }}
      style={styles.handle}
      testID="answer-card-handle"
    >
      <View style={styles.grip} />
    </Pressable>
  );
}

// The card's header row takes the drag (`useCardMotion`) wherever the finger starts on it, the grip, the line under it,
// or beside ✕; a press on the line or ✕ stays a press.
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
  // Between ✕'s room at the right and as much at the left, so that the grip stays centred and never covers ✕.
  handle: {
    position: 'absolute',
    top: 0,
    right: GRIP_SIDE,
    left: GRIP_SIDE,
    alignItems: 'center',
    height: GRIP_ROW,
    paddingTop: space[2],
  },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
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
