/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { myPartyQuery } from '@/api/queries';
import type { MyParty } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import {
  Avatar,
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  useToastAbove,
} from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { type PostDetailView, usePost } from '@/features/party/use-party';
import { agoWords } from '@/features/quests/room-adapter';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { useRoomActions } from '../room/use-room-actions';
import { JoinSheet } from './join-sheet';
import { Fill, Line } from './post-card';
import { PostReasons } from './post-reasons';
import { Faces, PhotoView, TagBadges } from './quest-photo';
import { useFindActions, usePartyActions } from './use-party-actions';

const FOOTER = 81;

// How the User is in the Quest's Party, which ending the Quest ends or leaves first.
function partyOf(questId: string, myParty: MyParty | null): 'leads' | 'member' | 'none' {
  if (myParty?.quest?.id !== questId) {
    return 'none';
  }
  return myParty.members.some(({ id, leader }) => id === myUserId() && leader) ? 'leads' : 'member';
}

interface FooterProps {
  post: PostView;
  onJoin: () => void;
  onHide: () => void;
  onWithdraw: (requestId: string) => void;
  onEnd: () => void;
}

function Note({ children }: { children: string }): ReactElement {
  return <Text style={styles.note}>{children}</Text>;
}

// The Leader's: end the Quest, or edit the post.
function OwnButtons({ questId, onEnd }: { questId: string; onEnd: () => void }): ReactElement {
  return (
    <View style={styles.buttons}>
      <View style={styles.button}>
        <Button full onPress={onEnd} size="lg" variant="danger">
          없애기
        </Button>
      </View>
      <View style={styles.button}>
        <Button
          full
          onPress={() => {
            router.push({ pathname: '/party-form', params: { questId } });
          }}
          size="lg"
        >
          수정하기
        </Button>
      </View>
    </View>
  );
}

// What the reader can do: join or ask, or hide another's post with `관심 없음`; wait on a request; end or edit the
// post; or nothing.
function Footer({ post, onJoin, onHide, onWithdraw, onEnd }: FooterProps): ReactElement {
  const { role } = post;
  if (role.kind === 'holder') {
    return <Note>이미 참여 중인 파티예요</Note>;
  }
  if (role.kind === 'leader') {
    return <OwnButtons onEnd={onEnd} questId={post.questId} />;
  }
  if (role.kind === 'approval' && role.requestId !== null) {
    const { requestId } = role;
    return (
      <View style={styles.waiting}>
        <Note>참여 신청을 기다리는 중이에요</Note>
        <Button
          onPress={() => {
            onWithdraw(requestId);
          }}
          variant="secondary"
        >
          신청 취소
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.buttons}>
      <Button onPress={onHide} size="lg" variant="secondary">
        관심 없음
      </Button>
      <View style={styles.button}>
        <Button full onPress={onJoin} size="lg">
          {role.kind === 'approval' ? '참여 신청' : '참여하기'}
        </Button>
      </View>
    </View>
  );
}

function Body({ post, reasons }: PostDetailView): ReactElement {
  return (
    <View style={styles.body}>
      <View style={[cardStyles.card, styles.card]}>
        <View style={styles.host}>
          <Avatar name={post.leader.name} />
          <View style={styles.hostWords}>
            <Text style={styles.hostName}>{`${post.leader.name} · 모집자`}</Text>
            <Text style={styles.hostLine}>{`${post.leader.department} · ${agoWords(post.createdAt, now())}`}</Text>
          </View>
          <Fill words={post.fill} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {post.title}
        </Text>
        {post.description === '' ? null : <Text style={styles.description}>{post.description}</Text>}
        {post.photo === null ? null : <PhotoView photo={post.photo} size="full" />}
        <TagBadges tags={post.tags} />
      </View>
      <View style={[cardStyles.card, styles.lines]}>
        <Line icon="clock">{post.time}</Line>
        <Line icon="pin">{post.place}</Line>
        <Line icon="users">{post.members}</Line>
        <Faces faces={post.faces} />
      </View>
      {reasons === null ? null : <PostReasons reasons={reasons} />}
    </View>
  );
}

// `없애기` ends the Quest as the room's `파티 없애기` does, and goes back once it is gone.
function useEndAsk(questId: string): () => Ask {
  const myParty = useQuery(myPartyQuery).data ?? null;
  const roomActions = useRoomActions();
  return () => ({
    title: '파티를 없앨까요?',
    body: '모집글과 파티가 함께 사라져요.',
    confirm: '없애기',
    danger: true,
    onConfirm: () =>
      void roomActions.endQuest(questId, partyOf(questId, myParty)).then((ended) => {
        if (ended) {
          router.back();
        }
      }),
  });
}

// The footer with what it does: `관심 없음` hides the post and goes back.
function PostFooter({
  post,
  onJoin,
  onAsk,
}: {
  post: PostView;
  onJoin: () => void;
  onAsk: (ask: Ask) => void;
}): ReactElement {
  const actions = usePartyActions();
  const findActions = useFindActions();
  const endAsk = useEndAsk(post.questId);
  return (
    <Footer
      onEnd={() => {
        onAsk(endAsk());
      }}
      onHide={() =>
        void findActions.hide(post.questId).then((hidden) => {
          if (!hidden) {
            return;
          }
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/party');
          }
        })
      }
      onJoin={onJoin}
      onWithdraw={(requestId) => void actions.withdraw(requestId)}
      post={post}
    />
  );
}

// 파티 모집글, the frame's `PartyPost`: a recruiting post, and what its reader can do with it.
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
            onJoin={() => {
              setJoining(post);
            }}
            post={post}
          />
        )
      }
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="파티 모집글"
    >
      {post === undefined && isPending ? <LoadingState /> : null}
      {post === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {post === null ? <EmptyState words="파티를 찾을 수 없어요" /> : null}
      {detail === undefined || detail === null ? null : <Body post={detail.post} reasons={detail.reasons} />}
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
  body: { gap: space[3], padding: space[4] },
  card: { gap: space[3] },
  host: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  hostWords: { flex: 1, gap: 2 },
  hostName: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  hostLine: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.33, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.ink },
  lines: { gap: space[2] },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  note: {
    flex: 1,
    paddingVertical: 14,
    textAlign: 'center',
    fontFamily: font.semiBold,
    fontSize: 15,
    lineHeight: 22,
    color: color.inkMuted,
  },
});
