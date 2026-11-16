/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { friendsQuery } from '@/api/queries';
import { now } from '@/clock';
import { color, radius, size, space, text } from '@/design-system';
import { followUpsOf } from '@/features/assistant/follow-ups';
import type { ChatBubble } from '@/features/assistant/use-chat';

const CELL_HEIGHT = 40;
const HIT_SLOP = (size.touchMin - CELL_HEIGHT) / 2;

// Under the reply on screen: its follow-ups (`followUpsOf`), with its Friends named as the User's list of Friends
// names them, in cells of one width, each sending its words as the User's message. Nothing while there are none.
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
    <View style={styles.row} testID="follow-ups">
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2] },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  words: { ...text.label, color: color.snuBlue },
});
