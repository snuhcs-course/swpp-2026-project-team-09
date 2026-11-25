/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Presence } from '@/api/types';
import {
  AppBar,
  Avatar,
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  font,
  Glass,
  Icon,
  IconButton,
  ListRow,
  LoadingState,
  radius,
  SearchField,
  SectionHeader,
  SidePanel,
  size,
  space,
  text,
} from '@/design-system';
import { type FriendView, PRESENCE_LABEL, withAge } from '@/features/friends/adapter';
import { profileLabel } from '@/features/friends/profile';
import { useFriends } from '@/features/friends/use-friends';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';

type Filter = Presence | 'all';

const PRESENCES: readonly Presence[] = ['free', 'class', 'moving', 'on', 'off'];

interface FriendPanelProps {
  open: boolean;
  onClose: () => void;
  // A press on a Friend's row.
  onShow: (friend: FriendView) => void;
}

// A search by name and department, where spaces do not count, as in the frame.
function found(friend: FriendView, query: string): boolean {
  const wanted = query.replaceAll(/\s/gu, '');
  return `${friend.name}${friend.department}`.replaceAll(/\s/gu, '').includes(wanted);
}

function FriendRow({ friend, onMeet, onShow }: { friend: FriendView } & Omit<GroupsProps, 'friends'>): ReactElement {
  return (
    <ListRow
      aside={friend.department}
      label={profileLabel(friend.name)}
      leading={
        <Avatar
          name={friend.name}
          source={friend.photo === null ? undefined : { uri: friend.photo }}
          status={friend.presence}
        />
      }
      lines={[withAge(friend.detail === '' ? friend.line : friend.detail, friend.minutesOld)]}
      onPress={() => {
        onShow(friend);
      }}
      title={friend.name}
      trailing={
        <Pressable
          accessibilityLabel={`${friend.name}님과 파티 만들기`}
          accessibilityRole="button"
          onPress={() => {
            onMeet(friend);
          }}
          style={({ pressed }) => [styles.meet, pressed && styles.pressed]}
        >
          <Glass level="inner" style={styles.fill}>
            <Icon color={color.snuBlue} name="calendar" size={18} />
          </Glass>
        </Pressable>
      }
    />
  );
}

interface GroupsProps {
  friends: readonly FriendView[];
  onMeet: (friend: FriendView) => void;
  onShow: FriendPanelProps['onShow'];
}

function Groups({ friends, onMeet, onShow }: GroupsProps): ReactElement {
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
              <FriendRow friend={friend} key={friend.id} onMeet={onMeet} onShow={onShow} />
            ))}
          </View>
        );
      })}
    </>
  );
}

// "공유 설정" and "+ 친구 추가" close the panel and show their screen. The footer has no ground of its own: it is the
// panel's glass, under a faint line, and "친구 추가" is a glass button.
function Footer({ onLeave }: { onLeave: () => void }): ReactElement {
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
      <Pressable accessibilityRole="link" hitSlop={space[2]} onPress={onShare} style={styles.sharing}>
        <Text style={styles.link}>공유 설정</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Glass level="inner" style={[styles.fill, styles.addFill]}>
          <Icon color={color.snuBlue} name="plus" size={20} />
          <Text style={styles.addWords}>친구 추가</Text>
        </Glass>
      </Pressable>
    </View>
  );
}

// Whether the friend panel is open, for the main screen: what floats over the map and the tab bar give way while it is,
// so that only the map shows through its glass (design review of A04-06).
let panelShown = false;
const panelWatchers = new Set<() => void>();

function setPanelShown(next: boolean): void {
  panelShown = next;
  for (const watcher of panelWatchers) {
    watcher();
  }
}

function watchPanel(watcher: () => void): () => void {
  panelWatchers.add(watcher);
  return (): void => {
    panelWatchers.delete(watcher);
  };
}

export function useFriendPanelShown(): boolean {
  return useSyncExternalStore(watchPanel, () => panelShown);
}

// Tells the main screen that the panel is open, and hides the tab bar meanwhile.
function useShownOnMain(open: boolean): void {
  useHideTabBarOnMain(open);
  useEffect(() => {
    setPanelShown(open);
    return (): void => {
      setPanelShown(false);
    };
  }, [open]);
}

// The friend panel, the `MainFriends` frame, on glass over the map. A Friend's calendar button closes the panel and
// opens 파티 만들기 as 비공개 with that Friend invited; a press elsewhere on the row is `onShow`'s.
export function FriendPanel({ open, onClose, onShow }: FriendPanelProps): ReactElement {
  const { data: friends, isPending, refetch } = useFriends();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const onMeet = ({ id }: FriendView): void => {
    onClose();
    router.push({ pathname: '/party-form', params: { friendId: id } });
  };
  const shown = friends?.filter((friend) => (filter === 'all' || friend.presence === filter) && found(friend, query));
  useShownOnMain(open);
  return (
    <SidePanel glass label="친구" onClose={onClose} open={open}>
      <AppBar
        clear
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
        {shown === undefined ? null : <Groups friends={shown} onMeet={onMeet} onShow={onShow} />}
      </ScrollView>
      <Footer onLeave={onClose} />
    </SidePanel>
  );
}

const MEET = 44;
// The board's faint line of the ink at 8%: the calendar button's rim and the line over the footer.
const FAINT_LINE = 'rgba(14, 19, 48, 0.08)';

const styles = StyleSheet.create({
  search: { paddingTop: space[3], paddingHorizontal: space[5] },
  scroll: { flex: 1 },
  list: { paddingRight: space[3], paddingBottom: space[3], paddingLeft: space[5] },
  // The `MainFriends` board's glass buttons: a frame with a faint rim, or the key colour's for 친구 추가, around the
  // glass that fills it.
  meet: { width: MEET, height: MEET, borderWidth: 1, borderColor: FAINT_LINE, borderRadius: radius.full },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  pressed: { opacity: 0.6 },
  footer: {
    gap: space[3],
    paddingTop: space[3],
    paddingHorizontal: space[5],
    borderTopWidth: 1,
    borderTopColor: FAINT_LINE,
  },
  add: { height: size.button, borderWidth: 1, borderColor: 'rgba(0, 26, 114, 0.22)', borderRadius: radius.md },
  addFill: { flexDirection: 'row', gap: space[2], borderRadius: radius.md },
  addWords: { ...text.bodyLg, fontFamily: font.semiBold, color: color.snuBlue },
  sharing: { alignSelf: 'flex-end' },
  link: { ...text.label, paddingVertical: space[3], color: color.blue600 },
});
