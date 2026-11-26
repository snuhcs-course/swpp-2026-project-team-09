/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { OfficialRecruiting } from '@/api/quest-parts-types';
import { EmptyState, ErrorState, LoadingState, space } from '@/design-system';
import { type BoardFilter, noPostsWords, postsOnBoard } from '@/features/party/finding';
import type { PostView } from '@/features/party/posts';
import { useFindPosts, useOfficialRecruiting } from '@/features/party/use-party';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { FindBar } from './find-bar';
import { FindCard } from './find-card';
import { JoinSheet, officialSubject } from './join-sheet';
import { OfficialBanner } from './official-banner';
import { PostSheet } from './post-sheet';
import { Seekers } from './seekers';
import { useFindActions, usePartyActions } from './use-party-actions';

// What the join sheet asks about: a post, or official recruiting.
type Joining = { kind: 'post'; post: PostView } | { kind: 'official'; recruiting: OfficialRecruiting };

interface PostsProps {
  board: BoardFilter;
  search: string;
  onOpen: (post: PostView) => void;
}

// The cards of the board chosen, or of every board while searching, in 찾기's order.
function Posts({ board, search, onOpen }: PostsProps): ReactElement {
  const { data: found, isPending, refetch } = useFindPosts(search);
  const posts = found === undefined ? undefined : postsOnBoard(found, board);
  return (
    <>
      {found === undefined && isPending ? <LoadingState /> : null}
      {found === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {posts?.length === 0 ? <EmptyState words={noPostsWords(board)} /> : null}
      {(posts ?? []).map((post) => (
        <FindCard key={post.questId} onOpen={onOpen} post={post} />
      ))}
    </>
  );
}

// The join sheets of 찾기: for a post, and for official recruiting.
function JoinSheets({ joining, onClose }: { joining: Joining | null; onClose: () => void }): ReactElement {
  const actions = usePartyActions();
  const findActions = useFindActions();
  return (
    <>
      <JoinSheet
        onClose={onClose}
        onJoin={(chosen) => void actions.join(chosen)}
        post={joining?.kind === 'post' ? joining.post : null}
      />
      <JoinSheet
        onClose={onClose}
        onJoin={() => {
          if (joining?.kind === 'official') {
            void findActions.joinOfficial(joining.recruiting);
          }
        }}
        post={joining?.kind === 'official' ? officialSubject(joining.recruiting) : null}
      />
    </>
  );
}

interface FindSheets {
  open: (post: PostView) => void;
  joinOfficial: (recruiting: OfficialRecruiting) => void;
  sheets: ReactElement;
}

// 찾기's sheets: the 모집글 a card opens, the join sheets that it and the banner lead to, and the confirm sheet that its
// `신청 취소` asks with. The 모집글 closes before either of the others opens.
function useFindSheets(): FindSheets {
  const [opened, setOpened] = useState<string | null>(null);
  const [joining, setJoining] = useState<Joining | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const close = (): void => {
    setOpened(null);
  };
  return {
    open: ({ questId }) => {
      setOpened(questId);
    },
    joinOfficial: (recruiting) => {
      setJoining({ kind: 'official', recruiting });
    },
    sheets: (
      <>
        <PostSheet
          onAsk={(next) => {
            close();
            setAsk(next);
          }}
          onClose={close}
          onJoin={(post) => {
            close();
            setJoining({ kind: 'post', post });
          }}
          questId={opened}
        />
        <JoinSheets
          joining={joining}
          onClose={() => {
            setJoining(null);
          }}
        />
        <ConfirmSheet
          ask={ask}
          label="확인"
          onClose={() => {
            setAsk(null);
          }}
        />
      </>
    ),
  };
}

// 찾기: the board filters or the search, which stay put; the banner of official recruiting; the recruiting posts
// ordered by the User's tags, whose cards open their 모집글 in a sheet; and the people looking for company. The build
// that asks the main server has no official recruiting and no people looking for company.
export function FindTab(): ReactElement {
  const [board, setBoard] = useState<BoardFilter>('all');
  // The words searched, or null while the filters show.
  const [search, setSearch] = useState<string | null>(null);
  const searching = search !== null;
  const list = useRef<ScrollView>(null);
  // Another board, or the search opened or closed, starts from its first card, not where the last list was scrolled.
  useEffect(() => {
    list.current?.scrollTo({ y: 0, animated: false });
  }, [board, searching]);
  const official = useOfficialRecruiting().data ?? [];
  const { open, joinOfficial, sheets } = useFindSheets();
  return (
    <>
      <FindBar board={board} onBoard={setBoard} onSearch={setSearch} search={search} />
      {official.length === 0 ? null : <OfficialBanner onOpen={joinOfficial} recruiting={official} />}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" ref={list} testID="find-list">
        <Posts board={searching ? 'all' : board} onOpen={open} search={search ?? ''} />
        <Seekers />
      </ScrollView>
      {sheets}
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[4], paddingBottom: space[4] },
});
