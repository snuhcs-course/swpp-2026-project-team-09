/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, shadow, size, space } from '@/design-system';
import { questionsOf } from '@/features/assistant/turn-outcome';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { QUESTION_LIST, QuestionList, questionRowsOf } from './answer/question-list';
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

export const NEW_PLACEHOLDER = '새로 물어보기 · 예: 공부할 자리';
export const CONTINUE_PLACEHOLDER = '이어서 말하기';

// The AI input's placeholder: "이어서 말하기" while a conversation is kept, the new one's after "새 대화", else the
// input's own.
export function placeholderOf(control: Chipped): string | undefined {
  if (control.framed) {
    return CONTINUE_PLACEHOLDER;
  }
  const chip = mapChipOf(control);
  if (chip === null) {
    return undefined;
  }
  return chip.kind === 'continue' ? CONTINUE_PLACEHOLDER : NEW_PLACEHOLDER;
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

// The map screen's chip over the input, "이어서 · {question} ▾" or "지난 대화 N ▾", and the list of questions it opens
// as a card standing on it (P04 tickets 10 and 11). A press outside the list or Android's back button closes it; a
// question brings its answer back, in its conversation. A reply that came while the answer was closed puts a dot on
// the chip until the answer is shown again.
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
        accessibilityState={{ expanded: open }}
        hitSlop={(size.touchMin - PAST_CHATS.height) / 2}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(!open);
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
        <Icon color={color.ink} name={open ? 'chevronUp' : 'chevronDown'} size={14} />
        {chip.kind === 'continue' && chip.unseen ? <View style={styles.unseen} testID="continue-unseen" /> : null}
      </Pressable>
    </>
  );
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

// "새 대화" beside the input while a conversation is kept and the answer is closed (board 17): it starts a new one at one
// press, and the input takes the focus; the kept one stays in the list.
export function NewChatBeside({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새 대화"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [besideStyles.button, pressed && styles.pressed]}
    >
      <Text style={besideStyles.words}>새 대화</Text>
    </Pressable>
  );
}

const besideStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: size.touchMin,
    paddingHorizontal: space[5],
    borderWidth: 1.5,
    borderColor: color.snuBlue,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  words: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20, color: color.snuBlue },
});
