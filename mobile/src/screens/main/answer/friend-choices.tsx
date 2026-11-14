/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Button, color, radius, space, text } from '@/design-system';

interface FriendChoice {
  id: string;
  name: string;
  // The line the Friend list shows, such as "수업 중 · 12:15까지".
  line: string;
}

interface FriendChoicesProps {
  // The Friends who are not in the Plan.
  friends: readonly FriendChoice[];
  disabled: boolean;
  onChoose: (userId: string) => void;
  onClose: () => void;
}

// The card's list of Friends to add to the Plan, opened by "＋ 같이".
export function FriendChoices({ friends, disabled, onChoose, onClose }: FriendChoicesProps): ReactElement {
  return (
    <View style={styles.choices}>
      <Text style={styles.question}>누구와 같이 먹을까요?</Text>
      {friends.length === 0 ? (
        <Text style={styles.none}>더 넣을 친구가 없어요</Text>
      ) : (
        <View style={styles.friends}>
          {friends.map(({ id, name, line }) => (
            <Pressable
              accessibilityLabel={`${name} 추가`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              key={id}
              onPress={() => {
                onChoose(id);
              }}
              style={({ pressed }): StyleProp<ViewStyle> => [styles.friend, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.friendText}>
                {line === '' ? name : `${name} · ${line}`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button onPress={onClose} variant="ghost">
        닫기
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { gap: space[2] },
  question: { ...text.label, color: color.ink },
  none: { ...text.body, color: color.inkMuted },
  friends: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  friend: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  friendText: { ...text.label, color: color.ink },
});
