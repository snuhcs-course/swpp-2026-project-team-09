/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';
import { MentionWords } from '../mention-words';
import { listedCount, mealCard } from './meal-list';

interface AnswerCaptionProps {
  control: ChatSheetControl;
  // Whether the list of questions is open in the card.
  listOpen: boolean;
  onList: () => void;
}

// What the caption's right side says for a meal answer with a Plan, one place or many ("올리면 1곳 목록"): while
// docked, a press that raises the card to the list of every place, the only way the docked card is raised; while
// raised, how that list is ordered. For a booking on the map, while lowered, a press that raises the card to the room,
// the seat, and the rest (P01 ticket 03). Null for any other answer.
function listWordsOf({
  answer: shown,
  card,
  booking,
  steps,
}: ChatSheetControl): { words: string; onPress: (() => void) | null } | null {
  if (booking !== null && steps === null) {
    return card.raised
      ? null
      : {
          words: '올리면 자리·열람실',
          onPress: () => {
            card.setRaised(true);
          },
        };
  }
  if (shown.answer === null || !mealCard(shown.answer)) {
    return null;
  }
  const count = listedCount(shown.answer);
  if (card.raised) {
    return { words: '걸음이 적은 순', onPress: null };
  }
  return {
    words: `올리면 ${String(count)}곳 목록`,
    onPress: () => {
      card.setRaised(true);
    },
  };
}

// What the caption says: the building asked about over the answer, else the turn's question; nothing for a turn the
// app opened with its own words (a room-window Notification's "예약 창이 열렸어요", P04 ticket 42), which the card
// already shows and which the User did not ask.
function askedOf({ howAbout, chat }: ChatSheetControl): string | null {
  if (howAbout.title !== null) {
    return howAbout.title;
  }
  const turn = turnOf(chat.bubbles);
  return turn === null || turn.after.some(({ id }) => id === turn.id) ? null : turn.asked;
}

// The right side: a press that raises the card, in the link colour with an up-chevron, or the list's order in words.
function ListWords({ list }: { list: NonNullable<ReturnType<typeof listWordsOf>> }): ReactElement {
  return list.onPress === null ? (
    <Text style={styles.side}>{list.words}</Text>
  ) : (
    <Pressable accessibilityRole="button" hitSlop={space[3]} onPress={list.onPress} style={styles.link}>
      <Text style={styles.linkWords}>{list.words}</Text>
      <Icon color={color.blue600} name="chevronUp" size={14} />
    </Pressable>
  );
}

// What the User asked, at the top of the answer's card (rule 5 of the 2026-11-22 redesign), or the building asked about
// over the answer ("여기면 어때?"), as a chip with the history mark and "⌄" so that it reads as a control (P04 ticket 44):
// a press opens the conversation's earlier questions in the card. A meal answer with several Plans says at the right how
// to reach the list of them. None when the User asked nothing.
export function AnswerCaption({ control, listOpen, onList }: AnswerCaptionProps): ReactElement | null {
  const asked = askedOf(control);
  const list = listWordsOf(control);
  if (asked === null) {
    return null;
  }
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`${asked}, 이전 질문 ${listOpen ? '닫기' : '보기'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: listOpen }}
        hitSlop={CHIP_SLOP}
        onPress={onList}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        testID="answer-caption"
      >
        <Icon color={color.inkMuted} name="history" size={14} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.words}>
          <MentionWords mentions={control.chat.bubbles.flatMap(({ mentions = [] }) => mentions)} words={asked} />
        </Text>
        <Icon color={color.inkMuted} name={listOpen ? 'chevronUp' : 'chevronDown'} size={14} />
      </Pressable>
      {list === null ? null : <ListWords list={list} />}
    </View>
  );
}

// The chip of 32, and a press area of 44 around it.
const CHIP_HEIGHT = 32;
const CHIP_SLOP = { top: 6, bottom: 6 };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: space[1],
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
  words: { ...text.label, flexShrink: 1, color: color.inkMuted },
  side: { ...text.caption, marginLeft: 'auto', color: color.inkSubtle },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  linkWords: { ...text.caption, color: color.blue600 },
});
