/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { myPartyQuery } from '@/api/queries';
import type { MyParty } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { Button, color, Dialog, font, space, text } from '@/design-system';
import { objectParticle } from '@/features/map/short-name';
import type { PostView } from '@/features/party/posts';
import { REMOVED_CAPTION } from '@/features/quests/refusals';
import type { Ask } from '../room/confirm-sheet';
import { useRoomActions } from '../room/use-room-actions';
import { useFindActions, usePartyActions, withdrawAsk } from './use-party-actions';

// The 모집글's buttons, on its screen and in 찾기's sheet.

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
    <View style={styles.joining}>
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
      {role.kind === 'approval' && role.removed ? <Text style={styles.caption}>{REMOVED_CAPTION}</Text> : null}
    </View>
  );
}

// `없애기` ends the Quest as the room's `파티 없애기` does, then `onGone`.
function useEndAsk(questId: string, onGone: () => void): () => Ask {
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
          onGone();
        }
      }),
  });
}

// "‘1인파티’를 숨길까요?", "‘저녁 러닝’을 숨길까요?".
function hideQuestion(title: string): string {
  return `‘${title}’${objectParticle(title)} 숨길까요?`;
}

interface PostFooterProps {
  post: PostView;
  onJoin: () => void;
  // Asks before `신청 취소` and `없애기`.
  onAsk: (ask: Ask) => void;
  // Once the post is hidden or ended: the screen goes back, the sheet closes.
  onGone: () => void;
}

// The footer with what it does. `관심 없음` asks in a dialog first, since a hidden post does not come back; `신청 취소`
// asks as 보낸 신청 does.
export function PostFooter({ post, onJoin, onAsk, onGone }: PostFooterProps): ReactElement {
  const { withdraw } = usePartyActions();
  const findActions = useFindActions();
  const endAsk = useEndAsk(post.questId, onGone);
  const [hiding, setHiding] = useState(false);
  return (
    <>
      <Footer
        onEnd={() => {
          onAsk(endAsk());
        }}
        onHide={() => {
          setHiding(true);
        }}
        onJoin={onJoin}
        onWithdraw={(requestId) => {
          onAsk(withdrawAsk({ requestId, questId: post.questId, title: post.title }, withdraw));
        }}
        post={post}
      />
      <Dialog
        body="숨긴 파티는 찾기에 다시 나오지 않아요. 한 번 숨기면 되돌릴 수 없어요."
        cancelLabel="취소"
        confirmLabel="숨기기"
        onCancel={() => {
          setHiding(false);
        }}
        onConfirm={() => {
          setHiding(false);
          void findActions.hide(post.questId).then((hidden) => {
            if (hidden) {
              onGone();
            }
          });
        }}
        title={hideQuestion(post.title)}
        visible={hiding}
      />
    </>
  );
}

const styles = StyleSheet.create({
  joining: { gap: space[1] },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
  caption: { ...text.caption, textAlign: 'center', color: color.inkMuted },
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
