/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isRefusal } from '@/api/errors';
import type { FriendLevel } from '@/api/types';
import {
  Avatar,
  color,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  LoadingState,
  RoundIcon,
  SearchField,
  SectionHeader,
  space,
  text,
  useToast,
} from '@/design-system';
import type { FriendView } from '@/features/friends/adapter';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { useFriendRequests } from '@/features/friends/use-friend-requests';
import { useFriends } from '@/features/friends/use-friends';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import { MasterOffLine } from '../master-off-line';
import { EndFriendship } from './end-friendship';
import { LevelTrack } from './level-track';
import { OffQuestion } from './off-question';
import { useLevels } from './use-levels';
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

interface FriendRowProps {
  friend: FriendView;
  level: FriendLevel;
  masterOff: boolean;
  onChoose: (level: FriendLevel) => void;
  onPress: () => void;
}

// A Friend, with the three levels the User may let them see under the name, off and disabled while the Master Switch
// is off.
function FriendRow({ friend, level, masterOff, onChoose, onPress }: FriendRowProps): ReactElement {
  return (
    <View style={styles.friend}>
      <Pressable
        accessibilityLabel={friend.name}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.who, pressed && styles.pressed]}
      >
        <Avatar name={friend.name} source={friend.photo === null ? undefined : { uri: friend.photo }} />
        <View style={styles.words}>
          <Text numberOfLines={1} style={styles.name}>
            {friend.name}
          </Text>
          <Text numberOfLines={1} style={styles.line}>
            {friend.visible ? friend.department : `${friend.department} · 위치 꺼짐`}
          </Text>
        </View>
      </Pressable>
      <LevelTrack label={`${friend.name}님에게 보일 위치`} level={level} masterOff={masterOff} onChoose={onChoose} />
    </View>
  );
}

interface ListProps {
  friends: readonly FriendView[];
  query: string;
  onPress: (friend: FriendView) => void;
}

// The list, and the question before a Friend's location is turned off the first time.
function Friends({ friends, query, onPress }: ListProps): ReactElement {
  const { levelOf, choose, asked, answer } = useLevels();
  const masterOff = useMasterSwitch().off;
  const shown = friends.filter((friend) => found(friend, query));
  return (
    <>
      <SectionHeader>{`친구 ${friends.length}`}</SectionHeader>
      <Text style={styles.note}>둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요</Text>
      {friends.length === 0 ? null : <MasterOffLine />}
      {friends.length === 0 ? <EmptyState words="아직 친구가 없어요" /> : null}
      {friends.length > 0 && shown.length === 0 ? <EmptyState words="결과 없음" /> : null}
      {shown.map((friend) => (
        <FriendRow
          friend={friend}
          key={friend.id}
          onPress={() => {
            onPress(friend);
          }}
          level={levelOf(friend)}
          masterOff={masterOff}
          onChoose={(level) => {
            choose(friend, level);
          }}
        />
      ))}
      <OffQuestion name={asked?.friend.name ?? null} onAnswer={answer} open={asked?.open === true} />
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

// 친구 관리, the `Friends` frame's list: 친구 추가, the entry to 친구 요청, and every Friend with the level the User
// lets them see. A press on a Friend offers to end the friendship.
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
  friend: { paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: color.border },
  who: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64 },
  words: { flex: 1, gap: 1 },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
