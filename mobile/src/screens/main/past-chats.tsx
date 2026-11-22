/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, shadow, size, space } from '@/design-system';
import { questionsOf } from '@/features/assistant/turn-outcome';
import type { ChatSheetControl } from './chat-sheet';
import { PAST_CHATS } from './layout';

// What the map screen's chip says of the conversation while the answer is closed: the one kept (board 17, P04 ticket
// 11), with whether a reply came while it was closed. Null while the answer is on screen or nothing is kept.
export interface MapChip {
  kind: 'continue';
  asked: string;
  unseen: boolean;
}

type Chipped = Pick<ChatSheetControl, 'framed' | 'said' | 'unseen'>;

export function mapChipOf({ framed, said, unseen }: Chipped): MapChip | null {
  if (framed || said.length === 0) {
    return null;
  }
  return { kind: 'continue', asked: questionsOf(said).at(-1)?.asked ?? said[0]?.text ?? '', unseen };
}

export const NEW_PLACEHOLDER = '무엇이든 물어보세요';
export const CONTINUE_PLACEHOLDER = '이어서 말하기';

// The AI input's placeholder: "이어서 말하기" on the answer, where it continues the conversation; "무엇이든 물어보세요" on
// the main map, where it always starts a new one (rule 4 of the 2026-11-22 redesign).
export function placeholderOf({ framed }: Pick<Chipped, 'framed'>): string {
  return framed ? CONTINUE_PLACEHOLDER : NEW_PLACEHOLDER;
}

interface PastChatsProps {
  control: Pick<ChatSheetControl, 'showAgain'>;
  chip: MapChip;
  // From the stage's bottom: where the chip stands.
  bottom: number;
}

// The map screen's chip over the input, "이어서 · {question} ›", the only thing above the input while a conversation is
// kept (board 1 of the 2026-11-22 redesign): a press shows that answer again, in its conversation. A reply that came
// while the answer was closed puts a dot on the chip until the answer is shown again. Earlier questions are in the
// answer's card, under its caption.
export function PastChats({ control, chip, bottom }: PastChatsProps): ReactElement {
  const label = `이어서, ${chip.asked}${chip.unseen ? ', 새 답 있음' : ''}`;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={(size.touchMin - PAST_CHATS.height) / 2}
      onPress={() => {
        Keyboard.dismiss();
        control.showAgain?.();
      }}
      style={({ pressed }) => [styles.chip, styles.continue, { bottom }, pressed && styles.pressed]}
      testID="past-chats"
    >
      <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.words, styles.strong]}>
        {`이어서 · ${chip.asked}`}
      </Text>
      <Icon color={color.snuBlue} name="chevronRight" size={14} />
      {chip.unseen ? <View style={styles.unseen} testID="continue-unseen" /> : null}
    </Pressable>
  );
}

// The dot of a reply not yet seen, at the chip's top right.
const UNSEEN = 10;

const styles = StyleSheet.create({
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
