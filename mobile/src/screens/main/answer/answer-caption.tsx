/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';
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
// raised, how that list is ordered. Null for any other answer.
function listWordsOf({
  answer: shown,
  card,
}: ChatSheetControl): { words: string; onPress: (() => void) | null } | null {
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

// What the User asked, as a small caption at the top of the answer's card (rule 5 of the 2026-11-22 redesign), or the
// building asked about over the answer ("여기면 어때?"). A press opens the conversation's earlier questions in the card.
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
        accessibilityLabel={`${asked}, 물은 것 ${listOpen ? '닫기' : '보기'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: listOpen }}
        onPress={onList}
        style={styles.asked}
        testID="answer-caption"
      >
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.words}>
          <MentionWords mentions={control.chat.bubbles.flatMap(({ mentions = [] }) => mentions)} words={asked} />
        </Text>
      </Pressable>
      {list === null ? null : list.onPress === null ? (
        <Text style={styles.side}>{list.words}</Text>
      ) : (
        <Pressable accessibilityRole="button" hitSlop={space[3]} onPress={list.onPress}>
          <Text style={styles.side}>{list.words}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  asked: { flex: 1, minWidth: 0 },
  words: { ...text.caption, color: color.inkMuted },
  side: { ...text.caption, color: color.inkSubtle },
});
