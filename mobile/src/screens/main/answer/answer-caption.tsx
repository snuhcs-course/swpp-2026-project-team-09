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
  // "＋ 새 질문" at the row's right end (P04 ticket 52).
  onAskNew: () => void;
}

// What the line under the card's grip says for a meal answer with a Plan, one place or many ("올리면 1곳 목록"): while
// docked, a press that raises the card to the list of every place; none while raised. For a booking on the map, while lowered, a press that raises the card to the room,
// the seat, and the rest (P01 ticket 03). Null for any other answer.
export function listWordsOf({
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
  // Raised, the line under the grip says "내리기" (`card-top.ts`), and the list heads itself.
  if (card.raised) {
    return null;
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

// "＋ 새 질문", one press from the docked card (P04 ticket 52): what the list of questions' own "＋ 새 질문" does.
function AskNew({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새 질문"
      accessibilityRole="button"
      hitSlop={CHIP_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.askNew, pressed && styles.pressed]}
      testID="answer-ask-new"
    >
      <Icon color={color.snuBlue} name="plus" size={14} />
      <Text numberOfLines={1} style={styles.askNewWords}>
        새 질문
      </Text>
    </Pressable>
  );
}

// What the User asked, at the top of the answer's card (rule 5 of the 2026-11-22 redesign), or the building asked about
// over the answer ("여기면 어때?"), as a chip with the history mark and "⌄" so that it reads as a control (P04 ticket 44):
// a press opens the conversation's earlier questions in the card. "＋ 새 질문" stands at the row's right end, and the chip
// gives way first, cut with "…"; while the list is open, the list's own header has it. None when the User asked nothing.
export function AnswerCaption({ control, listOpen, onList, onAskNew }: AnswerCaptionProps): ReactElement | null {
  const asked = askedOf(control);
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
      {listOpen ? null : <AskNew onPress={onAskNew} />}
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
  // As high as the chip, at the row's right end; it never shrinks.
  askNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: CHIP_HEIGHT,
    marginLeft: 'auto',
    // Its words end on the card's right line (P04 ticket 52).
    paddingLeft: space[2],
  },
  askNewWords: { ...text.label, color: color.snuBlue },
});
