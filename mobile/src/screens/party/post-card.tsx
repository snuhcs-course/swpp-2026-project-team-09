// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, cardStyles, color, font, Icon, type IconName, space } from '@/design-system';
import type { PostView } from '@/features/party/posts';

export function openPost(questId: string): void {
  router.push(`/post/${questId}`);
}

// "참여하기", or "참여 신청" for an Approval Quest.
export function joinLabel(post: PostView): string {
  return post.joinPolicy === 'approval' ? '참여 신청' : '참여하기';
}

// A line with its icon: the clock with the time, the pin with the place.
export function Line({ icon, children }: { icon: IconName; children: string }): ReactElement {
  return (
    <View style={styles.line}>
      <Icon color={color.inkMuted} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.lineWords}>
        {children}
      </Text>
    </View>
  );
}

// "3/8명", in the 파티's colour.
export function Fill({ words }: { words: string }): ReactElement {
  return <Text style={styles.fill}>{words}</Text>;
}

// The Badges over a post: `파티`, and the Global Event's title.
export function PostBadges({ post, fill = true }: { post: PostView; fill?: boolean }): ReactElement {
  return (
    <View style={styles.top}>
      <View style={styles.badges}>
        <Badge tone="party">파티</Badge>
        {post.event === null ? null : <Badge tone="official">{post.event}</Badge>}
      </View>
      {fill ? <Fill words={post.fill} /> : null}
    </View>
  );
}

// A card of 찾기's 모집 중인 파티.
export function PostCard({ post, onJoin }: { post: PostView; onJoin: (post: PostView) => void }): ReactElement {
  return (
    <View accessibilityLabel={post.title} style={[cardStyles.card, styles.card]}>
      <PostBadges post={post} />
      <Text style={styles.title}>{post.title}</Text>
      {post.description === '' ? null : (
        <Text numberOfLines={2} style={styles.description}>
          {post.description}
        </Text>
      )}
      <View style={styles.lines}>
        <Line icon="clock">{post.time}</Line>
        <Line icon="pin">{post.place}</Line>
      </View>
      <View style={styles.people}>
        <Avatar name={post.leader.name} size="sm" />
        <Text numberOfLines={1} style={styles.members}>
          {post.members}
        </Text>
        <Pressable
          accessibilityLabel={`${post.title} 모집글 자세히 보기`}
          accessibilityRole="button"
          hitSlop={space[3]}
          onPress={() => {
            openPost(post.questId);
          }}
        >
          <Text style={styles.more}>자세히 ›</Text>
        </Pressable>
      </View>
      <Button
        full
        onPress={() => {
          onJoin(post);
        }}
      >
        {joinLabel(post)}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  fill: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.party },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  lines: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineWords: { flexShrink: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  members: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  more: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.blue600 },
});
