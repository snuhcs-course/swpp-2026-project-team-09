/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { friendsQuery } from '@/api/queries';
import { now } from '@/clock';
import { color, radius, size, space, text } from '@/design-system';
import { followUpsOf } from '@/features/assistant/follow-ups';
import type { ChatBubble } from '@/features/assistant/use-chat';

const CELL_HEIGHT = 32;
const HIT_SLOP = (size.touchMin - CELL_HEIGHT) / 2;

// The reply's follow-ups (`followUpsOf`), with its Friends named as the User's list of Friends names them, in one row
// of small chips that scrolls sideways, each sending its words as the User's message. Nothing while there are none.
export function FollowUpChips({
  reply,
  onAsk,
}: {
  reply: ChatBubble | undefined;
  onAsk: (words: string) => void;
}): ReactElement | null {
  const friends = useQuery(friendsQuery).data;
  const names = useMemo(() => new Map((friends ?? []).map(({ id, name }) => [id, name])), [friends]);
  const words = followUpsOf(reply, now(), names);
  if (words.length === 0) {
    return null;
  }
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      testID="follow-ups"
    >
      {words.map((said) => (
        <Pressable
          accessibilityLabel={said}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          key={said}
          onPress={() => {
            onAsk(said);
          }}
          style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
        >
          <Text numberOfLines={1} style={styles.words}>
            {said}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2] },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  words: { ...text.label, color: color.snuBlue },
});
