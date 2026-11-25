/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { ApiError } from '@/api/errors';
import { friendRequestsQuery, friendsQuery } from '@/api/queries';
import type { Friend } from '@/api/types';
import type { FriendRequests } from '@/api/waiting-types';
import { Button, useToast } from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import type { MemberView } from '@/features/quests/room-adapter';
import { becameFriends, NO_ANSWER } from '../friends/words';

// Where the User stands with another member: a Friend, a request one of them sent, or neither.
export type MemberFriendship =
  { kind: 'friend' } | { kind: 'sent' } | { kind: 'received'; requestId: string } | { kind: 'none' };

export function friendshipWith(
  memberId: string,
  friends: readonly Pick<Friend, 'id'>[],
  requests: FriendRequests,
): MemberFriendship {
  if (friends.some(({ id }) => id === memberId)) {
    return { kind: 'friend' };
  }
  if (requests.sent.some(({ receiver }) => receiver.id === memberId)) {
    return { kind: 'sent' };
  }
  const received = requests.received.find(({ sender }) => sender.id === memberId);
  return received === undefined ? { kind: 'none' } : { kind: 'received', requestId: received.id };
}

const REFUSED: Partial<Record<string, string>> = {
  FRIEND_REQUEST_ALREADY_SENT: '이미 친구 요청을 보냈어요',
  FRIEND_REQUEST_NOT_FOUND: '이미 처리된 요청이에요',
  NOT_FELLOW_HOLDER: '파티 멤버에게만 보낼 수 있어요',
};

function refusedWords(error: unknown): string {
  return (error instanceof ApiError && error.code !== null ? REFUSED[error.code] : undefined) ?? NO_ANSWER;
}

// Sends a member a Friend Request, or accepts theirs, and toasts what came of it.
export function useFriendPresses(): {
  send: (member: MemberView) => void;
  accept: (member: MemberView, requestId: string) => void;
} {
  const changes = useFriendChanges();
  const showToast = useToast();
  const refusedToast = (error: unknown): void => {
    showToast(refusedWords(error), undefined, 'alert');
  };
  return {
    send: (member) => {
      changes.sendFriendRequestToUser(member.id).then(({ status }) => {
        showToast(status === 'friends' ? becameFriends(member.name) : `${member.name}님에게 친구 요청을 보냈어요`);
      }, refusedToast);
    },
    accept: (member, requestId) => {
      changes.acceptFriendRequest(requestId).then(() => {
        showToast(becameFriends(member.name));
      }, refusedToast);
    },
  };
}

// 친구 추가 on another member's row, an icon whose press `onAdd` asks about first: hidden for a Friend and until the
// lists come, dimmed once the User sent a request, and the words `수락` when the member sent one.
export function MemberFriendButton({ member, onAdd }: { member: MemberView; onAdd: () => void }): ReactElement | null {
  const friends = useQuery(friendsQuery).data;
  const requests = useQuery(friendRequestsQuery).data;
  const presses = useFriendPresses();
  if (friends === undefined || requests === undefined) {
    return null;
  }
  const friendship = friendshipWith(member.id, friends, requests);
  if (friendship.kind === 'friend') {
    return null;
  }
  if (friendship.kind === 'received') {
    return (
      <Button
        label={`${member.name}님의 친구 요청 수락`}
        onPress={() => {
          presses.accept(member, friendship.requestId);
        }}
      >
        수락
      </Button>
    );
  }
  const sent = friendship.kind === 'sent';
  return (
    <Button
      disabled={sent}
      icon="usersPlus"
      label={sent ? `${member.name}님에게 친구 요청됨` : `${member.name}님 친구 추가`}
      onPress={onAdd}
      variant="secondary"
    />
  );
}
