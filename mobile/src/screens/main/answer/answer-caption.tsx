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
// app opened with its own words (a room-window Notification's "예약 창이 열렸어요", P04 ticket 40), which the card
// already shows and which the User did not ask.
function askedOf({ howAbout, chat }: ChatSheetControl): string | null {
  if (howAbout.title !== null) {
    return howAbout.title;
  }
  const turn = turnOf(chat.bubbles);
  return turn === null || turn.after.some(({ id }) => id === turn.id) ? null : turn.asked;
}

// What the User asked, as a chip at the top of the answer's card (rule 5 of the 2026-11-22 redesign; a chip since P04
// ticket 43, so that it looks pressable), or the building asked about over the answer ("여기면 어때?"). A press opens
// the conversation's earlier questions in the card, "이전 질문".
// A meal answer with several Plans says at the right how to reach the list of them. None when the User asked nothing.
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
        onPress={onList}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        testID="answer-caption"
      >
        <Icon color={color.inkMuted} name="history" size={16} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.words}>
          <MentionWords mentions={control.chat.bubbles.flatMap(({ mentions = [] }) => mentions)} words={asked} />
        </Text>
        <Icon color={color.inkMuted} name={listOpen ? 'chevronUp' : 'chevronDown'} size={16} />
      </Pressable>
      {list === null ? null : list.onPress === null ? (
        <Text style={styles.order}>{list.words}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          hitSlop={space[3]}
          onPress={list.onPress}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          testID="caption-raise"
        >
          <Text style={styles.linkWords}>{list.words}</Text>
          <Icon color={color.snuBlue} name="chevronUp" size={16} />
        </Pressable>
      )}
    </View>
  );
}

// The earlier questions' chip: at least this high, on the card's light fill (P04 ticket 43).
const CHIP_HEIGHT = 32;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minWidth: 0,
    minHeight: CHIP_HEIGHT,
    marginRight: 'auto',
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
  words: { ...text.label, flexShrink: 1, color: color.ink },
  order: { ...text.caption, color: color.inkMuted },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkWords: { ...text.label, color: color.snuBlue },
});
