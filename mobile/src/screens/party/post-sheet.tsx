/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, EmptyState, ErrorState, LoadingState, space } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { usePost } from '@/features/party/use-party';
import type { Ask } from '../room/confirm-sheet';
import { PostContent } from './post-content';
import { PostFooter } from './post-footer';

interface PostSheetProps {
  // The post shown, or null while the sheet is closed.
  questId: string | null;
  onClose: () => void;
  // `참여하기` and `참여 신청`, for the join sheet.
  onJoin: (post: PostView) => void;
  // What `신청 취소` and `없애기` ask, for the confirm sheet.
  onAsk: (ask: Ask) => void;
}

function SheetBody({ questId, onClose, onJoin, onAsk }: PostSheetProps & { questId: string }): ReactElement {
  const { data: detail, isPending, refetch } = usePost(questId);
  if (detail === undefined) {
    return isPending ? <LoadingState /> : <ErrorState onRetry={refetch} />;
  }
  if (detail === null) {
    return <EmptyState words="파티를 찾을 수 없어요" />;
  }
  const { post } = detail;
  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <PostContent post={post} reasons={detail.reasons} />
      </ScrollView>
      <PostFooter
        onAsk={onAsk}
        onGone={onClose}
        onJoin={() => {
          onJoin(post);
        }}
        post={post}
      />
    </View>
  );
}

// 찾기's 모집글: a pressed card's post slides up over 찾기, as the 행사 tab's detail does, with the 모집글 screen's
// content and buttons. The top scrolls when it is long, the buttons staying under it.
export function PostSheet({ questId, onClose, onJoin, onAsk }: PostSheetProps): ReactElement {
  return (
    <BottomSheet label="파티 모집글" onClose={onClose} open={questId !== null}>
      {questId === null ? null : <SheetBody onAsk={onAsk} onClose={onClose} onJoin={onJoin} questId={questId} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: space[4], paddingHorizontal: space[5], paddingBottom: space[1] },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingBottom: space[1] },
});
