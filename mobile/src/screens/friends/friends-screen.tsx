// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isRefusal } from '@/api/errors';
import {
  Avatar,
  color,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  ListRow,
  LoadingState,
  RoundIcon,
  SearchField,
  SectionHeader,
  space,
  Switch,
  text,
  useToast,
} from '@/design-system';
import type { FriendView } from '@/features/friends/adapter';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { useFriendRequests } from '@/features/friends/use-friend-requests';
import { useFriends } from '@/features/friends/use-friends';
import { EndFriendship } from './end-friendship';
import { NO_ANSWER } from './words';

// A search by name and department, where spaces do not count, as in the frame.
function found(friend: FriendView, query: string): boolean {
  const wanted = query.replaceAll(/\s/gu, '');
  return `${friend.name}${friend.department}`.replaceAll(/\s/gu, '').includes(wanted);
}

// The rows at the top of the list: 친구 추가 with the navy round plus, and the entry to 친구 요청.
function Entries({ received }: { received: number | undefined }): ReactElement {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          router.push('/me/friends/add');
        }}
        style={({ pressed }) => [styles.entry, styles.add, pressed && styles.pressed]}
      >
        <RoundIcon fill={color.snuBlue} icon="plus" ink={color.onPrimary} />
        <Text style={styles.addLabel}>친구 추가</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          router.push('/me/friends/requests');
        }}
        style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
      >
        <RoundIcon fill={color.blue50} icon="users" ink={color.snuBlue} />
        <Text style={styles.entryLabel}>친구 요청</Text>
        {received === undefined ? null : <Text style={styles.entryCount}>{received}</Text>}
        <Icon color={color.inkMuted} name="chevronRight" size={16} />
      </Pressable>
    </>
  );
}

// The User's switch for one friendship: shown at once, turned back with a toast when the change fails. Gives the
// switch's value for a Friend and what a press does.
function useSharingSwitches(): [(friend: FriendView) => boolean, (friend: FriendView, on: boolean) => void] {
  const changes = useFriendChanges();
  const showToast = useToast();
  const [turning, setTurning] = useState<ReadonlyMap<string, boolean>>(new Map());
  const settle = (userId: string): void => {
    setTurning((now) => new Map([...now].filter(([id]) => id !== userId)));
  };
  const turn = (friend: FriendView, on: boolean): void => {
    setTurning((now) => new Map(now).set(friend.id, on));
    changes.setSharing(friend.id, on).then(
      () => {
        settle(friend.id);
      },
      () => {
        settle(friend.id);
        showToast('위치 공유를 바꾸지 못했어요');
      },
    );
  };
  return [(friend) => turning.get(friend.id) ?? friend.sharing, turn];
}

interface FriendRowProps {
  friend: FriendView;
  sharing: boolean;
  onTurn: (on: boolean) => void;
  onPress: () => void;
}

function FriendRow({ friend, sharing, onTurn, onPress }: FriendRowProps): ReactElement {
  return (
    <ListRow
      label={friend.name}
      leading={<Avatar name={friend.name} source={friend.photo === null ? undefined : { uri: friend.photo }} />}
      lines={[friend.visible ? friend.department : `${friend.department} · 위치 꺼짐`]}
      onPress={onPress}
      title={friend.name}
      trailing={<Switch label={`${friend.name}님과 위치 공유`} onValueChange={onTurn} value={sharing} />}
    />
  );
}

interface ListProps {
  friends: readonly FriendView[];
  query: string;
  onPress: (friend: FriendView) => void;
}

function Friends({ friends, query, onPress }: ListProps): ReactElement {
  const [sharingOf, turn] = useSharingSwitches();
  const shown = friends.filter((friend) => found(friend, query));
  return (
    <>
      <SectionHeader>{`친구 ${friends.length}`}</SectionHeader>
      <Text style={styles.note}>위치 공유를 끄면 서로의 위치가 보이지 않아요</Text>
      {friends.length === 0 ? <EmptyState words="아직 친구가 없어요" /> : null}
      {friends.length > 0 && shown.length === 0 ? <EmptyState words="결과 없음" /> : null}
      {shown.map((friend) => (
        <FriendRow
          friend={friend}
          key={friend.id}
          onPress={() => {
            onPress(friend);
          }}
          onTurn={(on) => {
            turn(friend, on);
          }}
          sharing={sharingOf(friend)}
        />
      ))}
    </>
  );
}

// What ending a friendship does once it is confirmed: the Friend leaves the list, the friend panel and the map. A
// friendship that ended already is fetched again without a word.
function useEnd(): (friend: FriendView) => void {
  const changes = useFriendChanges();
  const showToast = useToast();
  return (friend) => {
    changes.endFriendship(friend.id).then(
      () => {
        showToast(`${friend.name}님과 친구를 끊었어요`);
      },
      (error: unknown) => {
        if (!isRefusal(error, 404, 'FRIEND_NOT_FOUND')) {
          showToast(NO_ANSWER);
        }
      },
    );
  };
}

// 친구 관리, the `Friends` frame's list: 친구 추가, the entry to 친구 요청, and every Friend with the switch of the
// friendship. A press on a Friend offers to end the friendship.
export function FriendsScreen(): ReactElement {
  const friends = useFriends();
  const received = useFriendRequests().data?.received.length;
  const [query, setQuery] = useState('');
  const [pressed, setPressed] = useState<FriendView | null>(null);
  const end = useEnd();
  return (
    <FullScreenPanel
      count={friends.data?.length}
      leave={{ kind: 'back', onPress: router.back }}
      title="친구"
      under={
        <View style={styles.search}>
          <SearchField label="친구 검색" onChangeText={setQuery} placeholder="친구 검색" value={query} />
        </View>
      }
    >
      <View style={styles.list}>
        <Entries received={received} />
        {friends.data === undefined && friends.isPending ? <LoadingState /> : null}
        {friends.data === undefined && !friends.isPending ? <ErrorState onRetry={friends.refetch} /> : null}
        {friends.data === undefined ? null : <Friends friends={friends.data} onPress={setPressed} query={query} />}
      </View>
      <EndFriendship
        friend={pressed}
        onClose={() => {
          setPressed(null);
        }}
        onEnd={end}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  search: { paddingVertical: space[3], paddingHorizontal: space[4] },
  list: { paddingHorizontal: space[4], paddingBottom: space[8] },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  add: { minHeight: 60 },
  pressed: { backgroundColor: color.surfaceSubtle },
  addLabel: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.snuBlue },
  entryLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
  entryCount: { ...text.label, color: color.inkMuted },
  note: { ...text.caption, paddingBottom: space[1], color: color.inkMuted },
});
