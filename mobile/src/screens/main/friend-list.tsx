// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  color,
  font,
  Icon,
  mapText,
  onKey,
  presence,
  radius,
  shadow,
  space,
  text,
  textHalo,
  useToast,
} from '@/design-system';
import { type FriendView, withAge } from '@/features/friends/adapter';
import { useFriends } from '@/features/friends/use-friends';
import { cardId } from '@/features/map/adapter';
import { FriendPanel } from './friend-panel';
import { friendsWidth, listRows, LISTS, listsTop, type Room } from './layout';
import { CollapseButton, RowWindow } from './list-parts';
import type { MainMap } from './use-main-map';
import type { Selection } from './use-selection';

// How long "…님은 위치가 꺼져 있어요" stays, as in the frame.
const LOCATION_OFF_MS = 2000;

interface FriendListProps {
  map: MainMap;
  selection: Selection;
  // The room the list has: its column narrows on a narrow screen and its window is lower on a low one.
  room: Room;
}

interface RowsProps {
  friends: readonly FriendView[];
  shown: number;
  onPress: (friend: FriendView) => void;
}

// The pill at the list's head: "친구" and the number of Friends in the list. It opens the friend panel. Until the
// Friends are known it has no number.
function FriendPill({ count, onPress }: { count: number | null; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="친구 목록 열기"
      accessibilityRole="button"
      accessibilityValue={count === null ? undefined : { text: `${count}명` }}
      hitSlop={PILL_REACH}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <Icon color={color.onPrimary} name="users" size={16} />
      <Text style={styles.pillLabel}>친구</Text>
      {count === null ? null : (
        <Text style={styles.pillCount} testID="friend-count">
          {count}
        </Text>
      )}
      <Icon color={color.onPrimary} name="chevronRight" size={16} />
    </Pressable>
  );
}

// One Friend: the dot in the status's colour, the name, and the status with the place, and the age of an old
// position.
function FriendRow({ friend, onPress }: { friend: FriendView; onPress: () => void }): ReactElement {
  const line = withAge(friend.line, friend.minutesOld);
  return (
    <Pressable
      accessibilityHint={line}
      accessibilityLabel={`${friend.name} 지도에서 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <View style={[styles.dot, { backgroundColor: presence[friend.presence] }]} />
      <View style={styles.words}>
        <Text numberOfLines={1} style={styles.name}>
          {friend.name}
        </Text>
        <Text numberOfLines={1} style={styles.line}>
          {line}
        </Text>
      </View>
    </Pressable>
  );
}

// What a press on a Friend's row does: it brings the map to the Friend at the "close" level and opens their card,
// also when the map's cards are still to come; for a Friend whose position is not known it says so.
function useShow({ map, selection }: Pick<FriendListProps, 'map' | 'selection'>): (friend: FriendView) => void {
  const showToast = useToast();
  return (friend) => {
    if (friend.position === null) {
      showToast(`${friend.name}님은 위치가 꺼져 있어요`, LOCATION_OFF_MS);
      return;
    }
    map.goTo(friend.position, 'close');
    selection.selectOrWait(cardId.friend(friend.id));
  };
}

function Rows({ friends, shown, onPress }: RowsProps): ReactElement {
  return (
    <View style={styles.rows}>
      <RowWindow
        rows={friends.map((friend) => (
          <FriendRow
            friend={friend}
            key={friend.id}
            onPress={() => {
              onPress(friend);
            }}
          />
        ))}
        shown={shown}
        side="left"
        testID="friend-rows"
      />
    </View>
  );
}

// The friend list of the `Main` frame, at the left over the map: the pill, the round button that collapses the list,
// and every Friend in a window of up to three rows. The pill opens the friend panel over the whole screen.
export function FriendList({ map, selection, room }: FriendListProps): ReactElement {
  const friends = useFriends().data;
  const [open, setOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const show = useShow({ map, selection });
  const { top } = useSafeAreaInsets();
  const shown = listRows(room, top).friends;
  return (
    <View style={[styles.list, { top: listsTop(top), width: friendsWidth(room) }]} testID="friend-list">
      <View style={styles.header}>
        <FriendPill
          count={friends?.length ?? null}
          onPress={() => {
            setPanelOpen(true);
          }}
        />
        <CollapseButton
          list="친구 목록"
          onPress={() => {
            setOpen(!open);
          }}
          open={open}
          pill="left"
        />
      </View>
      {open && shown > 0 && friends !== undefined ? <Rows friends={friends} onPress={show} shown={shown} /> : null}
      <FriendPanel
        onClose={() => {
          setPanelOpen(false);
        }}
        open={panelOpen}
      />
    </View>
  );
}

// The frame's pill is 40 high; the room above and below brings its touch area to the design system's minimum.
const PILL_REACH = { top: space[1], bottom: space[1] } as const;
const HEADER_GAP = 6;
const DOT = 10;

const styles = StyleSheet.create({
  list: { position: 'absolute', left: LISTS.side, gap: LISTS.gap, pointerEvents: 'box-none' },
  header: { flexDirection: 'row', alignItems: 'center', gap: HEADER_GAP, pointerEvents: 'box-none' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    height: LISTS.header,
    paddingRight: space[3],
    paddingLeft: 14,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
    boxShadow: shadow.float,
  },
  pillPressed: { backgroundColor: color.snuBluePressed },
  pillLabel: { ...text.label, color: color.onPrimary },
  pillCount: { ...text.label, fontFamily: font.medium, color: onKey.textSubtle },
  rows: { paddingLeft: space[1], pointerEvents: 'box-none' },
  // A row is as wide as its words and no wider than its column: the map beside a short name takes the touch.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
    maxWidth: '100%',
    height: LISTS.row,
  },
  // Raised to the name's line, as in the frame.
  dot: {
    width: DOT,
    height: DOT,
    marginTop: -space[4],
    borderRadius: radius.full,
    boxShadow: shadow.mapMark,
  },
  words: { flexShrink: 1 },
  name: { ...mapText.rowTitle, ...textHalo, color: color.ink },
  line: { ...mapText.rowLine, ...textHalo, color: color.inkMuted },
});
