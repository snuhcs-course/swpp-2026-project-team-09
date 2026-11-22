/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Avatar, color, radius, shadow, space, text } from '@/design-system';
import { AI_INPUT } from './layout';
import type { MentionFriend, Mentions } from './use-mentions';

interface MentionListProps {
  // The Friends the "@" being typed matches, and what a press on one does.
  mention: Pick<Mentions, 'matches' | 'choose'>;
  // From the screen's bottom to the list's: just over the AI input.
  bottom: number;
}

// A row as high as a cell of the Friend choices with a second line, and five of them before the list scrolls.
const ROW_HEIGHT = 52;
const ROWS_SHOWN = 5;
const LIST_PADDING = space[1];

function Row({ friend, onChoose }: { friend: MentionFriend; onChoose: Mentions['choose'] }): ReactElement {
  const { name, department, photo } = friend;
  return (
    <Pressable
      accessibilityLabel={department === '' ? `${name} 언급` : `${name}, ${department}, 언급`}
      accessibilityRole="button"
      onPress={() => {
        onChoose(friend);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={name} ring="friend" size="sm" source={photo === null ? undefined : { uri: photo }} />
      <View style={styles.names}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {department === '' ? null : (
          <Text numberOfLines={1} style={styles.department}>
            {department}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// The User's Friends the "@" being typed matches, over the AI input and so over the keyboard: each with the face, the
// name and the department, which tells two Friends of one name apart. A press puts the Friend in as a mention.
export function MentionList({ mention, bottom }: MentionListProps): ReactElement | null {
  const { matches: friends, choose: onChoose } = mention;
  if (friends.length === 0) {
    return null;
  }
  return (
    <View style={[styles.list, { bottom }]} testID="mention-list">
      <ScrollView
        keyboardShouldPersistTaps="always"
        style={{ maxHeight: ROWS_SHOWN * ROW_HEIGHT + 2 * LIST_PADDING }}
        contentContainerStyle={styles.rows}
      >
        {friends.map((friend) => (
          <Row friend={friend} key={friend.userId} onChoose={onChoose} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    position: 'absolute',
    right: AI_INPUT.side,
    left: AI_INPUT.side,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
    overflow: 'hidden',
  },
  rows: { paddingVertical: LIST_PADDING },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: ROW_HEIGHT,
    paddingHorizontal: space[4],
  },
  pressed: { backgroundColor: color.blue50 },
  names: { flex: 1, minWidth: 0 },
  name: { ...text.label, color: color.ink },
  department: { ...text.caption, color: color.inkMuted },
});
