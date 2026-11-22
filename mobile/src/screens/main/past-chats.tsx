/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, shadow, size, space } from '@/design-system';
import { questionsOf } from '@/features/assistant/turn-outcome';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { QUESTION_LIST, QuestionList, questionRowsOf } from './answer/question-list';
import { turnOf } from '@/features/assistant/turn';
import { typingWordsOf } from '@/features/assistant/typing-words';
import { markdownLabel } from './chat-markdown';
import type { ChatSheetControl } from './chat-sheet';
import { PAST_CHATS } from './layout';

// What the map screen's chip says of the conversations while the answer is closed: the one the next message continues
// (board 17, P04 ticket 11), with whether a reply came while it was closed; or, after "새 대화", how many are kept
// (board 27, ticket 10). Null while the answer is on screen or nothing is kept.
export type MapChip = { kind: 'continue'; asked: string; unseen: boolean } | { kind: 'past'; count: number };

type Chipped = Pick<ChatSheetControl, 'framed' | 'said' | 'chat' | 'unseen'>;

export function mapChipOf({ framed, said, chat, unseen }: Chipped): MapChip | null {
  if (framed) {
    return null;
  }
  if (said.length > 0) {
    return { kind: 'continue', asked: questionsOf(said).at(-1)?.asked ?? said[0]?.text ?? '', unseen };
  }
  return chat.earlier.length > 0 ? { kind: 'past', count: chat.earlier.length } : null;
}

export const MAP_PLACEHOLDER = '무엇이든 물어보세요';
export const CONTINUE_PLACEHOLDER = '이어서 말하기';

// The AI input's placeholder: "이어서 말하기" in the answer, where a message goes on with the conversation, or the example
// of an answer the reply on screen gives ("예: 14:00부터 16:00", the rule of 2026-11-22); on the main map, where a message
// always starts a new one, "무엇이든 물어보세요" (P04 ticket 33).
export function placeholderOf({ framed, chat }: Pick<Chipped, 'framed' | 'chat'>): string {
  if (!framed) {
    return MAP_PLACEHOLDER;
  }
  const reply = turnOf(chat.bubbles)?.after[0];
  const example = reply === undefined || chat.waiting ? null : typingWordsOf(markdownLabel(reply.text)).example;
  return example ?? CONTINUE_PLACEHOLDER;
}

interface PastChatsProps {
  control: ChatSheetControl;
  chip: MapChip;
  // From the stage's bottom: where the chip stands.
  bottom: number;
  // The stage's height, null until it is laid out: the list takes at most part of it.
  stageHeight: number | null;
}

function chipWords(chip: MapChip): { words: string; label: string } {
  if (chip.kind === 'past') {
    return { words: `지난 대화 ${String(chip.count)}`, label: `지난 대화 ${String(chip.count)}개` };
  }
  return { words: `이어서 · ${chip.asked}`, label: `이어서, ${chip.asked}${chip.unseen ? ', 새 답 있음' : ''}` };
}

interface ChipListProps {
  control: ChatSheetControl;
  bottom: number;
  stageHeight: number | null;
  onClose: () => void;
}

// The chip's list over the map, over a scrim that closes it.
function ChipList({ control, bottom, stageHeight, onClose }: ChipListProps): ReactElement {
  return (
    <>
      <Pressable accessibilityLabel="목록 닫기" onPress={onClose} style={styles.scrim} testID="past-chats-scrim" />
      <View style={[styles.list, { bottom }]}>
        <QuestionList
          maxHeight={(stageHeight ?? bottom * 2) * QUESTION_LIST.share}
          onAskNew={() => {
            onClose();
            control.focusInput();
          }}
          onClearEarlier={control.chat.clearEarlier}
          onPick={(row) => {
            onClose();
            control.showTurn(row.turnId, row.conversation);
          }}
          rows={questionRowsOf(control)}
        />
      </View>
    </>
  );
}

// The map screen's chip over the input. "이어서 · {question} ›" brings the kept answer back at a press (P04 ticket 33);
// "지난 대화 N ▾" opens the list of questions as a card standing on it (P04 ticket 10), which a press outside it or
// Android's back button closes, and whose questions bring their answers back, in their conversations. A reply that
// came while the answer was closed puts a dot on the chip until the answer is shown again.
export function PastChats({ control, chip, bottom, stageHeight }: PastChatsProps): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  const focused = useIsFocused();
  useBackToClose(open && focused, close, { edge: false });
  const listBottom = bottom + PAST_CHATS.height + QUESTION_LIST.gap;
  const { words, label } = chipWords(chip);
  return (
    <>
      {open ? <ChipList bottom={listBottom} control={control} onClose={close} stageHeight={stageHeight} /> : null}
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={chip.kind === 'past' ? { expanded: open } : undefined}
        hitSlop={(size.touchMin - PAST_CHATS.height) / 2}
        onPress={() => {
          Keyboard.dismiss();
          if (chip.kind === 'continue') {
            control.showAgain?.();
          } else {
            setOpen(!open);
          }
        }}
        style={({ pressed }) => [
          styles.chip,
          chip.kind === 'continue' && styles.continue,
          { bottom },
          pressed && styles.pressed,
        ]}
        testID="past-chats"
      >
        <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.words, chip.kind === 'continue' && styles.strong]}>
          {words}
        </Text>
        <Icon color={color.ink} name={chevronOf(chip, open)} size={14} />
        {chip.kind === 'continue' && chip.unseen ? <View style={styles.unseen} testID="continue-unseen" /> : null}
      </Pressable>
    </>
  );
}

function chevronOf(chip: MapChip, open: boolean): IconName {
  if (chip.kind === 'continue') {
    return 'chevronRight';
  }
  return open ? 'chevronUp' : 'chevronDown';
}

// The dot of a reply not yet seen, at the chip's top right.
const UNSEEN = 10;

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  list: { position: 'absolute', right: QUESTION_LIST.side, left: QUESTION_LIST.side },
  chip: {
    position: 'absolute',
    left: PAST_CHATS.left,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: PAST_CHATS.height,
    paddingRight: 10,
    paddingLeft: 12,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  continue: { borderColor: color.snuBlue },
  pressed: { backgroundColor: color.surfaceSunken },
  words: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.ink },
  strong: { color: color.snuBlue },
  unseen: {
    position: 'absolute',
    top: -space[1],
    right: -space[1],
    width: UNSEEN,
    height: UNSEEN,
    borderRadius: UNSEEN / 2,
    borderWidth: 2,
    borderColor: color.surface,
    backgroundColor: color.danger,
  },
});
