/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, shadow, size } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { QUESTION_LIST, QuestionList, questionRowsOf } from './answer/question-list';
import type { ChatSheetControl } from './chat-sheet';
import { PAST_CHATS } from './layout';

// The map screen after "새 대화" (board 27): conversations are kept, and the current one holds nothing.
export function pastChatsShown(control: Pick<ChatSheetControl, 'framed' | 'said' | 'chat'>): boolean {
  return !control.framed && control.said.length === 0 && control.chat.earlier.length > 0;
}

export const NEW_PLACEHOLDER = '새로 물어보기 · 예: 공부할 자리';

interface PastChatsProps {
  control: ChatSheetControl;
  // From the stage's bottom: where the chip stands.
  bottom: number;
  // The stage's height, null until it is laid out: the list takes at most part of it.
  stageHeight: number | null;
}

// "지난 대화 N ▾" over the map, N the conversations kept, and the list of their questions it opens as a card standing
// on it (P04 ticket 10). A press outside the list or Android's back button closes it; a question takes its
// conversation up again with that answer on the map.
export function PastChats({ control, bottom, stageHeight }: PastChatsProps): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  const focused = useIsFocused();
  useBackToClose(open && focused, close, { edge: false });
  const count = control.chat.earlier.length;
  const listBottom = bottom + PAST_CHATS.height + QUESTION_LIST.gap;
  return (
    <>
      {open ? (
        <Pressable accessibilityLabel="목록 닫기" onPress={close} style={styles.scrim} testID="past-chats-scrim" />
      ) : null}
      {open ? (
        <View style={[styles.list, { bottom: listBottom }]}>
          <QuestionList
            maxHeight={(stageHeight ?? listBottom * 2) * QUESTION_LIST.share}
            onPick={(row) => {
              close();
              control.showTurn(row.turnId, row.conversation);
            }}
            rows={questionRowsOf(control)}
          />
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={`지난 대화 ${String(count)}개`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={(size.touchMin - PAST_CHATS.height) / 2}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(!open);
        }}
        style={({ pressed }) => [styles.chip, { bottom }, pressed && styles.pressed]}
        testID="past-chats"
      >
        <Text style={styles.words}>{`지난 대화 ${String(count)}`}</Text>
        <Icon color={color.ink} name={open ? 'chevronUp' : 'chevronDown'} size={14} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  list: { position: 'absolute', right: QUESTION_LIST.side, left: QUESTION_LIST.side },
  chip: {
    position: 'absolute',
    left: PAST_CHATS.left,
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
  pressed: { backgroundColor: color.surfaceSunken },
  words: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.ink },
});
