/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, Icon, size, space, text } from '@/design-system';
import { type Turn, turnsOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { markdownLabel } from '../chat-markdown';

const LINE_HEIGHT = 32;
const LINE_SLOP = (size.touchMin - LINE_HEIGHT) / 2;

// What an earlier turn shows of a bubble after its words: a Plan's reply its first Plan's lines, a Lookup's its lines,
// any other its words. Null for a bubble with nothing to show.
function linesOf({ answer, lookup, text: words }: ChatBubble): readonly AnswerLine[] | null {
  const lines = answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? lookup?.lines;
  if (lines !== undefined) {
    return lines;
  }
  const said = markdownLabel(words).trim();
  return said === '' ? null : said.split('\n').map((line) => [{ text: line, strong: false }]);
}

function EarlierTurn({ turn }: { turn: Turn }): ReactElement {
  const shown = turn.after.flatMap((bubble) => {
    const lines = linesOf(bubble);
    return lines === null ? [] : [{ id: bubble.id, lines }];
  });
  return (
    <View style={styles.turn} testID="earlier-turn">
      <Text style={styles.asked}>{turn.asked}</Text>
      {shown.map(({ id, lines }) => (
        <View key={id}>
          {lines.map((line, row) => (
            // The lines have no id, and their order is their meaning.
            // oxlint-disable-next-line react/no-array-index-key
            <Text key={row} style={styles.line}>
              {line.map(({ text: words, strong }, part) => (
                // oxlint-disable-next-line react/no-array-index-key
                <Text key={part} style={strong ? styles.strong : undefined}>
                  {words}
                </Text>
              ))}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// "지난 답 N개" at the top of the card while the conversation has turns before the one on screen: it opens them above
// that turn, the first first, and "접기" closes them. They are read-only: their Plans and Lookups are no longer on the
// map, so they have no buttons.
export function EarlierTurns({ bubbles }: { bubbles: readonly ChatBubble[] }): ReactElement | null {
  const [open, setOpen] = useState(false);
  const earlier = turnsOf(bubbles).slice(0, -1);
  if (earlier.length === 0) {
    return null;
  }
  const words = open ? '접기' : `지난 답 ${String(earlier.length)}개`;
  return (
    <View style={styles.earlier}>
      <Pressable
        accessibilityLabel={words}
        accessibilityRole="button"
        hitSlop={LINE_SLOP}
        onPress={() => {
          setOpen(!open);
        }}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text style={styles.toggleWords}>{words}</Text>
        <Icon color={color.blue600} name={open ? 'chevronUp' : 'chevronDown'} size={14} />
      </Pressable>
      {open ? earlier.map((turn) => <EarlierTurn key={turn.id} turn={turn} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  earlier: { gap: space[3] },
  toggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, height: LINE_HEIGHT },
  toggleWords: { ...text.label, color: color.blue600 },
  pressed: { opacity: 0.6 },
  turn: { gap: space[1], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: color.border },
  asked: { ...text.label, color: color.inkMuted },
  line: { ...text.body, color: color.ink },
  strong: { fontFamily: font.semiBold, color: color.snuBlue },
});
