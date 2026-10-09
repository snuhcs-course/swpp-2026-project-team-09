// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '@/api/types';
import { now } from '@/clock';
import { Badge, color, EmptyState, ErrorState, font, FullScreenPanel, LoadingState, space } from '@/design-system';
import { boardName } from '@/features/party/boards';
import { type PostView, postedWords } from '@/features/party/posts';
import { useBoardPosts } from '@/features/party/use-party';
import { Fill, openPost } from './post-card';

// A press opens the room of the User's own Quest and the post of another's.
function openFromBoard({ questId, role }: PostView): void {
  if (role.kind === 'leader' || role.kind === 'holder') {
    router.push(`/room/${questId}`);
  } else {
    openPost(questId);
  }
}

function BoardPost({ post }: { post: PostView }): ReactElement {
  const mark = post.role.kind === 'leader' ? '내 파티' : post.role.kind === 'holder' ? '참여 중' : null;
  return (
    <Pressable
      accessibilityLabel={post.title}
      accessibilityRole="button"
      onPress={() => {
        openFromBoard(post);
      }}
      style={({ pressed }) => [styles.post, pressed && styles.pressed]}
    >
      <View style={styles.host}>
        <Text numberOfLines={1} style={styles.hostWords}>
          <Text style={styles.hostName}>{post.leader.name}</Text>
          {` ${post.leader.department}`}
        </Text>
        <Text style={styles.posted}>{postedWords(post.createdAt, now())}</Text>
      </View>
      {mark === null ? null : (
        <Badge icon={false} tone="live">
          {mark}
        </Badge>
      )}
      <Text style={styles.title}>{post.title}</Text>
      {post.description === '' ? null : (
        <Text numberOfLines={2} style={styles.description}>
          {post.description}
        </Text>
      )}
      <View style={styles.foot}>
        <Text numberOfLines={1} style={styles.meta}>{`${post.time} · ${post.place}`}</Text>
        <Fill words={post.fill} />
      </View>
    </Pressable>
  );
}

// A board: its posts, the newest first.
export function BoardScreen({ board }: { board: Board }): ReactElement {
  const { data: posts, isPending, refetch } = useBoardPosts(board);
  return (
    <FullScreenPanel
      actions={<Text style={styles.order}>최신순</Text>}
      leave={{ kind: 'back', onPress: router.back }}
      title={boardName(board)}
    >
      {posts === undefined && isPending ? <LoadingState /> : null}
      {posts === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {posts?.length === 0 ? <EmptyState words="아직 모집글이 없어요" /> : null}
      {(posts ?? []).map((post) => (
        <BoardPost key={post.questId} post={post} />
      ))}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  order: { paddingRight: space[2], fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  post: {
    gap: 6,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  host: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  hostWords: { flex: 1, fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  hostName: { fontFamily: font.semiBold, color: color.ink },
  posted: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.semiBold, fontSize: 17, lineHeight: 24, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  meta: { flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
