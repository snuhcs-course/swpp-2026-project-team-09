/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardStyles, color, space, text } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { InfoLine, PostTop } from './post-content';

interface FindCardProps {
  post: PostView;
  onOpen: (post: PostView) => void;
}

// A card of 찾기: the board and the fill, the title, the time and the place each on its line, and the event of a 파티
// for one. It has no photo, faces or buttons: a press opens the 모집글. The Assistant's cards keep `PostCard`.
export function FindCard({ post, onOpen }: FindCardProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={post.title}
      accessibilityRole="button"
      onPress={() => {
        onOpen(post);
      }}
      style={({ pressed }) => [cardStyles.card, styles.card, pressed && styles.pressed]}
      testID={`post-${post.questId}`}
    >
      <PostTop post={post} />
      <Text style={styles.title}>{post.title}</Text>
      <View style={styles.lines}>
        <InfoLine icon="clock" lines={1} small>
          {post.time}
        </InfoLine>
        <InfoLine icon="pin" lines={2} small>
          {post.place}
        </InfoLine>
        {post.event === null ? null : (
          <InfoLine event icon="calendar" lines={1} small>
            {post.event}
          </InfoLine>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[2], paddingTop: space[3] },
  pressed: { backgroundColor: color.surfaceSubtle },
  title: { ...text.title, color: color.ink },
  lines: { gap: space[1] },
});
