// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Presence } from '@/api/types';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  ListRow,
  LoadingState,
  radius,
  SearchField,
  SectionHeader,
  SidePanel,
  space,
  text,
} from '@/design-system';
import { type FriendView, PRESENCE_LABEL, withAge } from '@/features/friends/adapter';
import { useFriends } from '@/features/friends/use-friends';
import { openMeetupForm } from '../meetup/open-meetup-form';

type Filter = Presence | 'all';

const PRESENCES: readonly Presence[] = ['free', 'class', 'moving', 'off'];

interface FriendPanelProps {
  open: boolean;
  onClose: () => void;
}

// A search by name and department, where spaces do not count, as in the frame.
function found(friend: FriendView, query: string): boolean {
  const wanted = query.replaceAll(/\s/gu, '');
  return `${friend.name}${friend.department}`.replaceAll(/\s/gu, '').includes(wanted);
}

function FriendRow({ friend, onMeet }: { friend: FriendView; onMeet: (friend: FriendView) => void }): ReactElement {
  return (
    <ListRow
      aside={friend.department}
      leading={
        <Avatar
          name={friend.name}
          source={friend.photo === null ? undefined : { uri: friend.photo }}
          status={friend.presence}
        />
      }
      lines={[withAge(friend.detail === '' ? friend.line : friend.detail, friend.minutesOld)]}
      title={friend.name}
      trailing={
        <Pressable
          accessibilityLabel={`${friend.name}님과 파티 만들기`}
          accessibilityRole="button"
          onPress={() => {
            onMeet(friend);
          }}
          style={({ pressed }) => [styles.meet, pressed && styles.meetPressed]}
        >
          <Icon color={color.snuBlue} name="calendar" size={18} />
        </Pressable>
      }
    />
  );
}

interface GroupsProps {
  friends: readonly FriendView[];
  onMeet: (friend: FriendView) => void;
}

function Groups({ friends, onMeet }: GroupsProps): ReactElement {
  if (friends.length === 0) {
    return <EmptyState words="결과 없음" />;
  }
  return (
    <>
      {PRESENCES.map((presence) => {
        const group = friends.filter((friend) => friend.presence === presence);
        return group.length === 0 ? null : (
          <View key={presence}>
            <SectionHeader>{`${PRESENCE_LABEL[presence]} · ${group.length}`}</SectionHeader>
            {group.map((friend) => (
              <FriendRow friend={friend} key={friend.id} onMeet={onMeet} />
            ))}
          </View>
        );
      })}
    </>
  );
}

// "공유 설정" and "+ 친구 추가" close the panel and show their screen.
function Footer({ seen, onLeave }: { seen: number; onLeave: () => void }): ReactElement {
  const { bottom } = useSafeAreaInsets();
  const onShare = (): void => {
    onLeave();
    router.navigate({ pathname: '/me', params: { show: 'sharing' } });
  };
  const onAdd = (): void => {
    onLeave();
    router.push('/me/friends/add');
  };
  return (
    <View style={[styles.footer, { paddingBottom: space[6] + bottom }]}>
      <View style={styles.sharing}>
        <Badge tone="live">{`친구 ${seen}명과 위치 공유 중`}</Badge>
        <Pressable accessibilityRole="link" hitSlop={space[2]} onPress={onShare}>
          <Text style={styles.link}>공유 설정</Text>
        </Pressable>
      </View>
      <Button full icon="plus" onPress={onAdd} size="lg" variant="secondary">
        친구 추가
      </Button>
    </View>
  );
}

// The friend panel, the `MainFriends` frame: every Friend by what they are doing, with a search and chips, how many
// the User sees now, the way to the 위치 공유 card of 내 정보 and to 친구 추가. A Friend's calendar button closes the
// panel and opens the Meetup form for that Friend.
export function FriendPanel({ open, onClose }: FriendPanelProps): ReactElement {
  const { data: friends, isPending, refetch } = useFriends();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const onMeet = ({ id, name }: FriendView): void => {
    onClose();
    openMeetupForm(id, name);
  };
  const shown = friends?.filter((friend) => (filter === 'all' || friend.presence === filter) && found(friend, query));
  return (
    <SidePanel label="친구" onClose={onClose} open={open}>
      <AppBar
        actions={<IconButton icon="x" label="닫기" onPress={onClose} />}
        count={friends?.length}
        line={false}
        title="친구"
      />
      <View style={styles.search}>
        <SearchField label="친구 검색" onChangeText={setQuery} placeholder="이름, 학과 검색" value={query} />
      </View>
      {friends === undefined ? null : (
        <ChipRow
          chips={[
            { key: 'all', label: '전체', count: friends.length },
            ...PRESENCES.map((presence) => ({
              key: presence,
              label: PRESENCE_LABEL[presence],
              count: friends.filter((friend) => friend.presence === presence).length,
            })),
          ]}
          hideEmpty
          onSelect={setFilter}
          selected={filter}
        />
      )}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" style={styles.scroll}>
        {shown === undefined && isPending ? <LoadingState /> : null}
        {shown === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {shown === undefined ? null : <Groups friends={shown} onMeet={onMeet} />}
      </ScrollView>
      <Footer onLeave={onClose} seen={friends?.filter(({ visible }) => visible).length ?? 0} />
    </SidePanel>
  );
}

const MEET = 44;

const styles = StyleSheet.create({
  search: { paddingTop: space[3], paddingHorizontal: space[5] },
  scroll: { flex: 1 },
  list: { paddingRight: space[3], paddingBottom: space[3], paddingLeft: space[5] },
  meet: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MEET,
    height: MEET,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.full,
    backgroundColor: color.surface,
  },
  meetPressed: { backgroundColor: color.blue50 },
  footer: {
    gap: space[3],
    paddingTop: space[3],
    paddingHorizontal: space[5],
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
  sharing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  link: { ...text.label, paddingVertical: space[3], color: color.blue600 },
});
