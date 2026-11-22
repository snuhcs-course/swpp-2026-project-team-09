/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, radius, size, space, text } from '@/design-system';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

// A small chip of the dock's row for what the docked card keeps folded: "지난 답 N개", or the answer's note. A press
// raises the card with it open. A reply's buttons take the same chip (an offer, 다시 시도, a Lookup's ask), disabled
// while the next reply is on its way, for they act on the turn before.
export function DockChip({
  words,
  onPress,
  disabled = false,
}: {
  words: string;
  onPress: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text numberOfLines={1} style={styles.words}>
        {words}
      </Text>
    </Pressable>
  );
}

// The dock's line (board 8), at most two lines and cut there (P04 ticket 18: one sentence of the model fits, its
// question included); a reply of words alone takes up to five (P04 ticket 43).
const LINES = 2;
export const WORDS_LINES = 5;

function LineWords({ line, lines }: { line: AnswerLine; lines: number }): ReactElement {
  return (
    <Text ellipsizeMode="tail" numberOfLines={lines} style={styles.lineWords} testID="dock-line-words">
      {line.map(({ text: words, strong }, part) => (
        // The parts have no id, and their order is their meaning.
        // oxlint-disable-next-line react/no-array-index-key
        <Text key={part} style={strong ? styles.strong : undefined}>
          {words}
        </Text>
      ))}
    </Text>
  );
}

// The line laid out whole and unseen, which tells whether the shown line is cut.
function Measure({
  line,
  lines,
  onCut,
}: {
  line: AnswerLine;
  lines: number;
  onCut: (cut: boolean) => void;
}): ReactElement {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onTextLayout={({ nativeEvent }) => {
        onCut(nativeEvent.lines.length > lines);
      }}
      style={[styles.lineWords, styles.measure]}
      testID="dock-line-measure"
    >
      {line.map(({ text: words }) => words).join('')}
    </Text>
  );
}

interface DockLineProps {
  line: AnswerLine;
  // What a press opens: the whole reply in the raised card ("›"). Left out, the line takes a press only while it is
  // cut, and then `onMore` opens it ("더 보기").
  onPress?: () => void;
  onMore?: () => void;
  // The most lines it shows before it is cut; two unless given.
  lines?: number;
}

// The line, which says "더 보기" at its end while its words are cut, so that the rest is always one press away (P04
// ticket 43), and "›" otherwise while a press opens it. Without a press, nothing at its end.
export function DockLine({ line, onPress, onMore, lines = LINES }: DockLineProps): ReactElement {
  const [cut, setCut] = useState(false);
  const press = onPress ?? (cut ? onMore : undefined);
  const measure = <Measure line={line} lines={lines} onCut={setCut} />;
  if (press === undefined) {
    return (
      <View style={styles.line} testID="dock-line">
        <LineWords line={line} lines={lines} />
        {measure}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityHint={cut ? '더 보기' : '전체 보기'}
      accessibilityRole="button"
      onPress={press}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
      testID="dock-line"
    >
      <LineWords line={line} lines={lines} />
      {measure}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={cut ? styles.moreWords : styles.more}
        testID={cut ? 'dock-line-more' : undefined}
      >
        {cut ? '더 보기' : '›'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    justifyContent: 'center',
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  words: { ...text.label, color: color.inkMuted },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    gap: space[1],
    minHeight: CHIP_HEIGHT,
  },
  lineWords: { ...text.body, flexShrink: 1, color: color.ink },
  more: { ...text.body, color: color.inkMuted },
  moreWords: { ...text.label, alignSelf: 'flex-end', color: color.snuBlue },
  // Laid out at the line's width and never seen.
  measure: { position: 'absolute', top: 0, right: 0, left: 0, opacity: 0 },
  strong: { fontFamily: font.bold, color: color.snuBlue },
});
