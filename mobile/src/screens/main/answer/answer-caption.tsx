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

interface AnswerCaptionProps {
  control: ChatSheetControl;
  // Whether the list of questions is open in the card.
  listOpen: boolean;
  onList: () => void;
}

// What the caption's right side says for a meal answer with several Plans: while docked, a press that raises the card
// to the list of every candidate; while raised, how that list is ordered. Null for any other answer.
function listWordsOf({
  answer: shown,
  card,
}: ChatSheetControl): { words: string; onPress: (() => void) | null } | null {
  const count = shown.answer?.plans.length ?? 0;
  if (shown.answer?.input.kind !== 'meal' || count < 2) {
    return null;
  }
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

// What the User asked, as a small caption at the top of the answer's card (rule 5 of the 2026-11-22 redesign), or the
// building asked about over the answer ("여기면 어때?"). A press opens the conversation's earlier questions in the card.
// A meal answer with several Plans says at the right how to reach the list of them.
export function AnswerCaption({ control, listOpen, onList }: AnswerCaptionProps): ReactElement {
  const asked = control.howAbout.title ?? turnOf(control.chat.bubbles)?.asked ?? '';
  const list = listWordsOf(control);
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
