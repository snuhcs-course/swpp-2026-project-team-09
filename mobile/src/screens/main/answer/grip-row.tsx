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
export const GRIP_SIDE = size.touchMin + space[1];

// What the line under the grip says, and what a press on it does: raise the card to the list ("올리면 11곳 목록 ⌃"), or
// nothing while it heads the raised list ("11곳 · 걸음이 적은 순").
export interface GripWords {
  words: string;
  onPress: (() => void) | null;
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
      <Icon color={color.inkSubtle} name="chevronUp" size={12} />
    </Pressable>
  );
}

function CloseButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={CLOSE_ANSWER_LABEL}
      accessibilityRole="button"
      hitSlop={(size.touchMin - GRIP_ROW) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      testID="answer-close"
    >
      <View style={styles.closeMark}>
        <Icon color={color.inkMuted} name="x" size={18} />
      </View>
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
  // Over the top of the open card's content, or in the docked card's flow.
  over: boolean;
}

export function GripRow({ handle, words, onClose, over }: GripRowProps): ReactElement {
  return (
    <View style={[styles.row, over && styles.over]}>
      {handle}
      {words === null ? null : <Line words={words} />}
      {onClose === null ? null : <CloseButton onPress={onClose} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: GRIP_ROW, pointerEvents: 'box-none' },
  over: { position: 'absolute', top: 0, right: 0, left: 0, zIndex: 1 },
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
    top: 0,
    right: space[1],
    alignItems: 'center',
    justifyContent: 'center',
    width: size.touchMin,
    height: GRIP_ROW,
  },
  closeMark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
});
