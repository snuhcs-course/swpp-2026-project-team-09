// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isRefusal } from '@/api/errors';
import {
  Avatar,
  Button,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  ListRow,
  LoadingState,
  SectionHeader,
  space,
  text,
  useToast,
} from '@/design-system';
import type { FriendRequestView, FriendRequestsView } from '@/features/friends/adapter';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { useFriendRequests } from '@/features/friends/use-friend-requests';
import { becameFriends, NO_ANSWER } from './words';

type Answer = 'accept' | 'decline' | 'cancel';

// What an answer does, and what it says once done. A request that waits no more was answered or cancelled
// meanwhile: the requests are fetched again with the change, and the toast says so.
function useAnswer(): (request: FriendRequestView, answer: Answer) => void {
  const changes = useFriendChanges();
  const showToast = useToast();
  const sends = {
    accept: changes.acceptFriendRequest,
    decline: changes.declineFriendRequest,
    cancel: changes.cancelFriendRequest,
  };
  const says: Record<Answer, (name: string) => string | null> = {
    accept: becameFriends,
    decline: () => null,
    cancel: () => '친구 요청을 취소했어요',
  };
  return (request, answer) => {
    sends[answer](request.id).then(
      () => {
        const words = says[answer](request.name);
        if (words !== null) {
          showToast(words);
        }
      },
      (error: unknown) => {
        showToast(isRefusal(error, 404, 'FRIEND_REQUEST_NOT_FOUND') ? '이미 처리된 요청이에요' : NO_ANSWER);
      },
    );
  };
}

function RequestRow({ request, children }: { request: FriendRequestView; children: ReactNode }): ReactElement {
  return (
    <ListRow
      leading={<Avatar name={request.name} />}
      lines={[request.department]}
      title={request.name}
      trailing={<View style={styles.buttons}>{children}</View>}
    />
  );
}

function Requests({ requests }: { requests: FriendRequestsView }): ReactElement {
  const answer = useAnswer();
  const { received, sent } = requests;
  return (
    <>
      <SectionHeader>{`받은 요청 · ${received.length}`}</SectionHeader>
      {received.length === 0 ? <EmptyState words="받은 요청이 없어요" /> : null}
      {received.map((request) => (
        <RequestRow key={request.id} request={request}>
          <Button
            onPress={() => {
              answer(request, 'decline');
            }}
            variant="secondary"
          >
            거절
          </Button>
          <Button
            onPress={() => {
              answer(request, 'accept');
            }}
          >
            수락
          </Button>
        </RequestRow>
      ))}
      {sent.length === 0 ? null : <SectionHeader>{`보낸 요청 · ${sent.length}`}</SectionHeader>}
      {sent.map((request) => (
        <RequestRow key={request.id} request={request}>
          <Button
            onPress={() => {
              answer(request, 'cancel');
            }}
            variant="secondary"
          >
            요청 취소
          </Button>
        </RequestRow>
      ))}
    </>
  );
}

// 친구 요청, the `Friends` frame's requests: those sent to the User, each with its answer, and those the User sent,
// each with its cancel.
export function RequestsScreen(): ReactElement {
  const requests = useFriendRequests();
  return (
    <FullScreenPanel
      count={requests.data?.received.length}
      leave={{ kind: 'back', onPress: router.back }}
      title="친구 요청"
    >
      <View style={styles.list}>
        <Text style={styles.note}>수락하면 서로의 위치를 지도에서 볼 수 있어요</Text>
        {requests.data === undefined && requests.isPending ? <LoadingState /> : null}
        {requests.data === undefined && !requests.isPending ? <ErrorState onRetry={requests.refetch} /> : null}
        {requests.data === undefined ? null : <Requests requests={requests.data} />}
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space[4], paddingBottom: space[8] },
  note: { ...text.body, paddingTop: space[3], color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
});
