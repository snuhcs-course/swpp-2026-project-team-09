/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState, ErrorState, FullScreenPanel, LoadingState, space, useToastAbove } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { usePost } from '@/features/party/use-party';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { JoinSheet } from './join-sheet';
import { PostContent } from './post-content';
import { PostFooter } from './post-footer';
import { usePartyActions } from './use-party-actions';

const FOOTER = 81;

// Back to where the User came from, or to 찾기 when the post was the first screen.
function leave(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/party');
  }
}

// 파티 모집글, the frame's `PartyPost`: a recruiting post, as 찾기's sheet shows it, and what its reader can do with it.
// It goes back once the post is hidden or ended.
export function PostScreen({ questId }: { questId: string }): ReactElement {
  const { data: detail, isPending, refetch } = usePost(questId);
  const post = detail === undefined || detail === null ? detail : detail.post;
  const actions = usePartyActions();
  const [joining, setJoining] = useState<PostView | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  useToastAbove(FOOTER, useIsFocused());
  return (
    <FullScreenPanel
      footer={
        post === undefined || post === null ? undefined : (
          <PostFooter
            onAsk={setAsk}
            onGone={leave}
            onJoin={() => {
              setJoining(post);
            }}
            post={post}
          />
        )
      }
      leave={{ kind: 'back', onPress: router.back }}
      title="파티 모집글"
    >
      {post === undefined && isPending ? <LoadingState /> : null}
      {post === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {post === null ? <EmptyState words="파티를 찾을 수 없어요" /> : null}
      {detail === undefined || detail === null ? null : (
        <View style={styles.body}>
          <PostContent post={detail.post} reasons={detail.reasons} />
        </View>
      )}
      <JoinSheet
        onClose={() => {
          setJoining(null);
        }}
        onJoin={(chosen) => void actions.join(chosen)}
        post={joining}
      />
      <ConfirmSheet
        ask={ask}
        label="확인"
        onClose={() => {
          setAsk(null);
        }}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4] },
});
