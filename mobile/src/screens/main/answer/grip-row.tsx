/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, size, space, text } from '@/design-system';

// The answer card's top row (P04 ticket 52): the handle in the middle, one muted line of the list's words under the
// grip, and ✕ at the right end, which closes the answer and keeps the conversation. Every card over the map closes by
// ✕, a drag down, and Android's back; "←" is only for a page pushed from the right.

export const CLOSE_ANSWER_LABEL = '답 닫기';

// The row's height, and the room ✕ keeps at each end so that the handle between stays centred and never covers it.
export const GRIP_ROW = 40;
export const GRIP_SIDE = 64;
// ✕'s visible circle, as wide as the stop button's (`RoundButton`), whose press reaches past it to the least touch size.
const CLOSE_MARK = 36;

// What the line under the grip says, and what a press on it does: docked, raise the card ("올리면 11곳 목록 ⌃"); raised
// or full, take it one step down ("내리기 ⌄"). Without a press it only says.
export interface GripWords {
  words: string;
  onPress: (() => void) | null;
  // The way a press moves the card: up or down.
  way?: 'up' | 'down';
}

function Line({ words }: { words: GripWords }): ReactElement {
  const line = (
    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.words}>
      {words.words}
    </Text>
  );
  return words.onPress === null ? (
    <View style={[styles.line, styles.still]}>{line}</View>
  ) : (
    <Pressable accessibilityRole="button" hitSlop={space[2]} onPress={words.onPress} style={styles.line}>
      {line}
      <Icon color={color.inkSubtle} name={words.way === 'down' ? 'chevronDown' : 'chevronUp'} size={12} />
    </Pressable>
  );
}

// ✕ with its circle's right edge on the card's right line (`edge`).
function CloseButton({ onPress, edge }: { onPress: () => void; edge: number }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={CLOSE_ANSWER_LABEL}
      accessibilityRole="button"
      hitSlop={(size.touchMin - CLOSE_MARK) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.close, { right: edge }, pressed && styles.pressed]}
      testID="answer-close"
    >
      <Icon color={color.ink} name="x" size={18} />
    </Pressable>
  );
}

interface GripRowProps {
  // The handle between the ends: the open card's, which a drag moves, or the docked card's; null for a card of one
  // height.
  handle: ReactElement | null;
  words: GripWords | null;
  // ✕; null leaves it out.
  onClose: (() => void) | null;
  // The card's right line, from its right edge, which ✕'s circle ends on.
  edge: number;
}

export function GripRow({ handle, words, onClose, edge }: GripRowProps): ReactElement {
  return (
    <View style={styles.row}>
      {handle}
      {words === null ? null : <Line words={words} />}
      {onClose === null ? null : <CloseButton edge={edge} onPress={onClose} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: GRIP_ROW, pointerEvents: 'box-none' },
  // Under the grip (8 down and 4 high), centred between the ends.
  line: {
    position: 'absolute',
    top: space[4],
    right: GRIP_SIDE,
    left: GRIP_SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  still: { pointerEvents: 'none' },
  words: { ...text.caption, flexShrink: 1, color: color.inkSubtle },
  close: {
    position: 'absolute',
    top: (GRIP_ROW - CLOSE_MARK) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: CLOSE_MARK,
    height: CLOSE_MARK,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
});
