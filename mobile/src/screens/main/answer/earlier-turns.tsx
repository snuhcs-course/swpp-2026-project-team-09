/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import type { ShownChatCard } from '@/api/quest-parts-types';
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

// A card's name as its card shows it on top.
function titleOf(card: ShownChatCard): string | null {
  if (card.kind === 'globalEvent') {
    return card.globalEvent.title;
  }
  if (card.kind === 'quest') {
    return card.quest.title;
  }
  return card.kind === 'restaurant' ? card.restaurant.name : (card.library.space?.name ?? null);
}

// The words the User asked, over a turn. A turn of the app's own bubbles alone has none.
export function TurnQuestion({ turn }: { turn: Turn }): ReactElement | null {
  return turn.after[0]?.id === turn.id ? null : (
    <Text style={styles.asked} testID="turn-question">
      {turn.asked}
    </Text>
  );
}

function EarlierTurn({ turn }: { turn: Turn }): ReactElement {
  const shown = turn.after.flatMap((bubble) => {
    const lines = linesOf(bubble);
    const titles = bubble.cards.flatMap((card) => titleOf(card) ?? []);
    return lines === null && titles.length === 0 ? [] : [{ id: bubble.id, lines: lines ?? [], titles }];
  });
  return (
    <View style={styles.turn} testID="earlier-turn">
      <TurnQuestion turn={turn} />
      {shown.map(({ id, lines, titles }) => (
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
          {titles.map((title, row) => (
            // Two cards may share a name; their order is the reply's.
            // oxlint-disable-next-line react/no-array-index-key
            <Text key={row} style={styles.title}>
              · {title}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// "지난 답 N개" under the turn on screen while the conversation has turns before it: it opens them below, the latest
// first, so the turn on screen stays where it was read; "접기" closes them. They are read-only: their Plans and
// Lookups are no longer on the map, so they have no buttons, and their cards are named only.
interface EarlierTurnsProps {
  bubbles: readonly ChatBubble[];
  // Held by the frame, so that the dock's "지난 답 N개" raises the card with the turns open. Left out, its own.
  opening?: { open: boolean; setOpen: (open: boolean) => void };
}

export function EarlierTurns({ bubbles, opening }: EarlierTurnsProps): ReactElement | null {
  const own = useState(false);
  const [open, setOpen] = opening === undefined ? own : [opening.open, opening.setOpen];
  const earlier = turnsOf(bubbles).slice(0, -1).toReversed();
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
  earlier: { gap: space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: color.border },
  toggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, height: LINE_HEIGHT },
  toggleWords: { ...text.label, color: color.blue600 },
  pressed: { opacity: 0.6 },
  turn: { gap: space[1], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: color.border },
  asked: { ...text.label, color: color.inkMuted },
  line: { ...text.body, color: color.ink },
  title: { ...text.body, color: color.ink },
  strong: { fontFamily: font.semiBold, color: color.snuBlue },
});
