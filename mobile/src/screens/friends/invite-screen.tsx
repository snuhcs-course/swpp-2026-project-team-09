/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/errors';
import type { UserSummary } from '@/api/types';
import {
  Avatar,
  Button,
  color,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  text,
  useToast,
} from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { type InviteLinkView, useInviteLink } from '@/features/friends/use-invite-link';
import { keep } from '@/storage/kept';
import { alreadyFriends, becameFriends, NO_ANSWER } from './words';

type Unusable = Exclude<InviteLinkView['status'], 'usable'>;

// What a refusal on accepting says: the link's status it found.
const REFUSED: Record<string, Unusable> = {
  INVITE_LINK_NOT_FOUND: 'not-found',
  OWN_INVITE_LINK: 'own',
  INVITE_LINK_USED: 'used',
  INVITE_LINK_EXPIRED: 'expired',
  ALREADY_FRIENDS: 'friend',
};

const UNUSABLE: Record<Unusable, (name: string) => { title: string; body?: string }> = {
  used: () => ({ title: '이미 사용된 초대 링크예요' }),
  expired: () => ({
    title: '기간이 지난 초대 링크예요',
    body: '초대 링크는 만든 뒤 24시간 동안 쓸 수 있어요. 새 링크를 받아 주세요.',
  }),
  own: () => ({ title: '내가 보낸 초대 링크예요', body: '친구에게 보내 주세요.' }),
  friend: (name) => ({ title: alreadyFriends(name) }),
  'not-found': () => ({ title: '찾을 수 없는 초대 링크예요' }),
};

function Sender({ sender, title }: { sender: UserSummary | null; title: string }): ReactElement {
  return (
    <View style={styles.sender}>
      {sender === null ? null : <Avatar name={sender.name} size="lg" />}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {sender === null ? null : <Text style={styles.department}>{sender.department}</Text>}
    </View>
  );
}

// A press of 수락: the two become Friends, and the screen closes on 지도. A refusal shows the link's status.
function useAccept(token: string, onRefused: (status: Unusable) => void): (sender: UserSummary) => void {
  const changes = useFriendChanges();
  const showToast = useToast();
  return (sender) => {
    changes.acceptInviteLink(token).then(
      () => {
        router.dismissTo('/main');
        showToast(becameFriends(sender.name));
      },
      (error: unknown) => {
        const status = error instanceof ApiError && error.code !== null ? REFUSED[error.code] : undefined;
        if (status === undefined) {
          showToast(NO_ANSWER);
        } else {
          onRefused(status);
        }
      },
    );
  };
}

function Shown({ link, token }: { link: InviteLinkView; token: string }): ReactElement {
  const [refused, setRefused] = useState<Unusable | null>(null);
  const accept = useAccept(token, setRefused);
  const status = refused ?? link.status;
  if (status === 'usable' && link.sender !== null) {
    const { sender } = link;
    return (
      <View style={styles.body}>
        <Sender sender={sender} title={`${sender.name}님의 친구 초대`} />
        <Text style={styles.note}>
          수락하면 친구가 되고, 서로의 위치를 지도에서 볼 수 있어요. 위치 공유는 친구마다 끌 수 있어요.
        </Text>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button full onPress={router.back} size="lg" variant="secondary">
              거절
            </Button>
          </View>
          <View style={styles.button}>
            <Button
              full
              onPress={() => {
                accept(sender);
              }}
              size="lg"
            >
              수락
            </Button>
          </View>
        </View>
      </View>
    );
  }
  const unusable = status === 'usable' ? 'not-found' : status;
  const sender = unusable === 'not-found' ? null : link.sender;
  const words = UNUSABLE[unusable](sender?.name ?? '');
  return (
    <View style={styles.body}>
      <Sender sender={sender} title={words.title} />
      {words.body === undefined ? null : <Text style={styles.note}>{words.body}</Text>}
      <Button full onPress={router.back} size="lg">
        확인
      </Button>
    </View>
  );
}

// The accept screen of an Invite Link, which no frame draws: who sent it and what accepting means, or why it cannot
// be accepted. The token the phone kept for it is dropped once it is shown.
export function InviteScreen({ token }: { token: string }): ReactElement {
  const link = useInviteLink(token);
  useEffect(() => {
    void keep({ inviteToken: null });
  }, [token]);
  return (
    <FullScreenPanel leave={{ kind: 'close', onPress: router.back }} title="친구 초대">
      {link.data === undefined && link.isPending ? <LoadingState /> : null}
      {link.data === undefined && !link.isPending ? <ErrorState onRetry={link.refetch} /> : null}
      {link.data === undefined ? null : <Shown link={link.data} token={token} />}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[6], paddingTop: space[8], paddingHorizontal: space[5], paddingBottom: space[8] },
  sender: { alignItems: 'center', gap: space[2] },
  title: { ...text.title, fontFamily: font.bold, textAlign: 'center', color: color.ink },
  department: { ...text.body, color: color.inkMuted },
  note: { ...text.body, textAlign: 'center', color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
