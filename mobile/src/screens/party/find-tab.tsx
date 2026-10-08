import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, EmptyState, ErrorState, font, LoadingState, SearchField, space } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { useRecruitingPosts } from '@/features/party/use-party';
import { JoinSheet } from './join-sheet';
import { PostCard } from './post-card';
import { usePartyActions } from './use-party-actions';

function matches(post: PostView, search: string): boolean {
  const words = search.replaceAll(/\s/gu, '');
  return words === '' || `${post.title}${post.description}`.replaceAll(/\s/gu, '').includes(words);
}

// 찾기: the search, and 모집 중인 파티, the recruiting Quests, the newest first.
export function FindTab(): ReactElement {
  const { data: posts, isPending, refetch } = useRecruitingPosts();
  const actions = usePartyActions();
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState<PostView | null>(null);
  const shown = (posts ?? []).filter((post) => matches(post, search));
  return (
    <>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SearchField label="파티 검색" onChangeText={setSearch} placeholder="파티 검색" value={search} />
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.heading}>
            모집 중인 파티
          </Text>
          <Pressable
            accessibilityLabel="전체 보기"
            accessibilityRole="button"
            hitSlop={space[3]}
            onPress={() => {
              router.push('/boards');
            }}
          >
            <Text style={styles.all}>전체 보기 ›</Text>
          </Pressable>
        </View>
        {posts === undefined && isPending ? <LoadingState /> : null}
        {posts === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {posts !== undefined && shown.length === 0 ? <EmptyState words="결과 없음" /> : null}
        {shown.map((post) => (
          <PostCard key={post.questId} onJoin={setJoining} post={post} />
        ))}
      </ScrollView>
      <JoinSheet
        onClose={() => {
          setJoining(null);
        }}
        onJoin={(post) => void actions.join(post)}
        post={joining}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] },
  heading: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  all: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.blue600 },
});
