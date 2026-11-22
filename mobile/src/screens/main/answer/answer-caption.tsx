/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, Icon } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';
import { MentionWords } from '../mention-words';
import { chipLook, CHIP_SLOP } from './card-header';

interface AnswerCaptionProps {
  control: ChatSheetControl;
  // Whether the list of questions is open in the card.
  listOpen: boolean;
  onList: () => void;
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

// What the User asked, at the left of the card's header row (rule 5 of the 2026-11-22 redesign), or the building asked
// about over the answer ("여기면 어때?"), as a chip with the history mark and "⌄" so that it reads as a control (P04
// ticket 44): a press opens the conversation's earlier questions in the card. It takes the room "＋ 새 대화" and ✕ leave
// and gives way first, cut with "…" (P04 ticket 52). None when the User asked nothing.
export function AnswerCaption({ control, listOpen, onList }: AnswerCaptionProps): ReactElement | null {
  const asked = askedOf(control);
  if (asked === null) {
    return null;
  }
  return (
    <Pressable
      accessibilityLabel={`${asked}, 이전 질문 ${listOpen ? '닫기' : '보기'}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: listOpen }}
      hitSlop={CHIP_SLOP}
      onPress={onList}
      style={({ pressed }) => [chipLook.chip, styles.chip, pressed && chipLook.pressed]}
      testID="answer-caption"
    >
      <Icon color={color.inkMuted} name="history" size={14} />
      <Text ellipsizeMode="tail" numberOfLines={1} style={[chipLook.words, styles.words]}>
        <MentionWords mentions={control.chat.bubbles.flatMap(({ mentions = [] }) => mentions)} words={asked} />
      </Text>
      <Icon color={color.inkMuted} name={listOpen ? 'chevronUp' : 'chevronDown'} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexShrink: 1 },
  words: { flexShrink: 1 },
});
